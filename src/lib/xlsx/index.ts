/**
 * 零依赖 XLSX 导出内核
 *
 * 职责：把「列定义 + 数据行」编成真正的 .xlsx（OOXML）字节流，并负责触发浏览器本地下载。
 * 不依赖 SheetJS / ExcelJS / file-saver，产物可以直接用 Excel、WPS、Numbers、Google Sheets 打开。
 *
 * 使用方式（业务侧一般直接用它封装好的组件 `@/components/ui/ExcelExportButton`）：
 * ```ts
 * downloadExcel({
 *   fileName: '客户清单',
 *   sheets: [
 *     defineSheet<CustomerRow>({
 *       name: '客户列表',
 *       title: '客户台账',
 *       note: '导出时间 2024-05-17 18:00',
 *       columns: [
 *         { title: '客户', key: 'company', width: 24 },
 *         { title: '累计成交额', key: 'amount', type: 'currency' },
 *         { title: '贡献占比', key: 'share', type: 'percent' },
 *         { title: '最近下单', key: 'lastOrderAt', type: 'date' },
 *       ],
 *       rows: customers,
 *       total: true,
 *     }),
 *   ],
 * });
 * ```
 *
 * 单元格类型（`type`）与 Excel 中的写入方式：
 * | type | 写入 | 单元格格式 |
 * | --- | --- | --- |
 * | `text` | 内联字符串 | 常规（左对齐、自动换行） |
 * | `number` | 数值 | `#,##0`（右对齐） |
 * | `currency` | 数值 | `"¥"#,##0`（右对齐） |
 * | `percent` | 数值（**传比例，0.123 表示 12.3%**） | `0.0%`（右对齐） |
 * | `date` / `datetime` | Excel 日期序列号 | `yyyy/m/d` / `yyyy/m/d hh:mm`（居中） |
 * | `boolean` | 布尔 | 常规 |
 *
 * 日期按 **Asia/Shanghai** 挂钟时间换算成 Excel 序列号，与页面展示（`src/lib/format.ts`）
 * 完全一致，同时在 Excel 里依然是可排序、可筛选的真日期。
 */

import { createZip, type ZipEntry } from './zip';
import { formatDate, formatDateTime } from '@/lib/format';

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const EXCEL_EXTENSION = '.xlsx';

/** 单元格原始取值 */
export type ExcelValue = string | number | boolean | Date | null | undefined;

/** 单元格类型，决定写入方式与 Excel 数字格式 */
export type ExcelCellType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean';

export interface ExcelColumn<T extends object> {
  /** 表头文字 */
  title: string;
  /** 取数字段（Server Component 向客户端组件传参时只能用字符串键） */
  key?: keyof T & string;
  /** 自定义取值（仅客户端组件可用：函数无法跨越 RSC 边界） */
  value?: (row: T) => ExcelValue;
  /** 单元格类型，默认 `text` */
  type?: ExcelCellType;
  /** 列宽（字符数），不填则按内容自动计算 */
  width?: number;
  /** 小数位：`number` / `currency` / `percent` 生效（`percent` 默认 1 位） */
  precision?: number;
}

export interface ExcelSheet<T extends object = Record<string, unknown>> {
  /** 工作表名（Excel 限制 31 字符、禁止 []:*?/\，内部会自动清洗与去重） */
  name: string;
  /** 表格上方的标题行 */
  title?: string;
  /** 标题下方的说明行（适合写导出时间 / 筛选条件 / 数据口径） */
  note?: string;
  columns: readonly ExcelColumn<T>[];
  rows: readonly T[];
  /** 是否在末尾追加合计行（自动汇总 `number` / `currency` 列） */
  total?: boolean;
  /** 合计行首列文案，默认「合计」 */
  totalLabel?: string;
  /** 是否冻结表头，默认 true */
  freezeHeader?: boolean;
  /** 是否在表头加筛选器，默认 true */
  autoFilter?: boolean;
}

export interface ExcelWorkbook<T extends object = Record<string, unknown>> {
  sheets: readonly ExcelSheet<T>[];
  /** 文件名（不含扩展名）；不传则取第一个工作表名 + 导出日期 */
  fileName?: string;
}

/** 组件属性里用来承载「多种行类型混合」的宽松别名 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyExcelSheet = ExcelSheet<any>;
/** @see AnyExcelSheet */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyExcelWorkbook = ExcelWorkbook<any>;

/** 类型推导辅助：让调用方写 `defineSheet<Order>({ ... })` 时校验 `key` 是否存在 */
export function defineSheet<T extends object>(sheet: ExcelSheet<T>): ExcelSheet<T> {
  return sheet;
}

/** @see defineSheet */
export function defineWorkbook<T extends object>(workbook: ExcelWorkbook<T>): ExcelWorkbook<T> {
  return workbook;
}

/* -------------------------------------------------------------------------- */
/* XML 基础工具                                                                */
/* -------------------------------------------------------------------------- */

const XML_PROLOG = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAX_CELL_TEXT = 32767;
/** 1899-12-30（Excel 序列号零点）到 1970-01-01 的天数 */
const EXCEL_EPOCH_DAYS = 25569;
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

const encoder = new TextEncoder();

function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

/** XML 特殊字符转义（含控制字符剔除，否则 Excel 会判定文件损坏） */
function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 0 → A、25 → Z、26 → AA */
function columnLetter(index: number): string {
  let rest = index + 1;
  let letters = '';
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return letters;
}

/* -------------------------------------------------------------------------- */
/* 样式表                                                                      */
/* -------------------------------------------------------------------------- */

const FONT_NORMAL = '<font><sz val="11"/><color rgb="FF262626"/><name val="Calibri"/></font>';
const FONT_BOLD = '<font><b/><sz val="11"/><color rgb="FF262626"/><name val="Calibri"/></font>';
const FONT_TITLE = '<font><b/><sz val="14"/><color rgb="FF1F1F1F"/><name val="Calibri"/></font>';
const FONT_NOTE = '<font><i/><sz val="10"/><color rgb="FF8C8C8C"/><name val="Calibri"/></font>';

const FILL_NONE = '<fill><patternFill patternType="none"/></fill>';
const FILL_GRAY = '<fill><patternFill patternType="gray125"/></fill>';
const FILL_HEADER =
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF0FB"/><bgColor indexed="64"/></patternFill></fill>';
const FILL_TOTAL =
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F9"/><bgColor indexed="64"/></patternFill></fill>';

const BORDER_NONE = '<border><left/><right/><top/><bottom/><diagonal/></border>';
const BORDER_THIN =
  '<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right>' +
  '<top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>';

/** 固定 xf 索引（其余按用到的数字格式动态追加） */
const XF_HEADER = 1;
const XF_TEXT = 2;
const XF_TITLE = 3;
const XF_NOTE = 4;
const XF_TOTAL_LABEL = 5;

interface XfOptions {
  numFmtId?: number;
  fontId?: number;
  fillId?: number;
  borderId?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
}

function xf(options: XfOptions = {}): string {
  const attrs = [
    `numFmtId="${options.numFmtId ?? 0}"`,
    `fontId="${options.fontId ?? 0}"`,
    `fillId="${options.fillId ?? 0}"`,
    `borderId="${options.borderId ?? 0}"`,
    'xfId="0"',
  ];
  if (options.numFmtId) attrs.push('applyNumberFormat="1"');
  if (options.fontId) attrs.push('applyFont="1"');
  if (options.fillId) attrs.push('applyFill="1"');
  if (options.borderId) attrs.push('applyBorder="1"');
  attrs.push('applyAlignment="1"');
  const alignment = `<alignment horizontal="${options.align ?? 'left'}" vertical="center"${
    options.wrap ? ' wrapText="1"' : ''
  }/>`;
  return `<xf ${attrs.join(' ')}>${alignment}</xf>`;
}

/** 生成某个单元格类型对应的 Excel 数字格式代码 */
function numberFormatCode(type: ExcelCellType, precision?: number): string | null {
  const decimals = Math.min(Math.max(precision ?? 0, 0), 6);
  const zeros = '0'.repeat(decimals);
  switch (type) {
    case 'number':
      return decimals > 0 ? `#,##0.${zeros}` : '#,##0';
    case 'currency':
      return decimals > 0 ? `&quot;¥&quot;#,##0.${zeros}` : '&quot;¥&quot;#,##0';
    case 'percent':
      return `0.${'0'.repeat(Math.max(precision ?? 1, 1))}%`;
    case 'date':
      return 'yyyy/m/d';
    case 'datetime':
      return 'yyyy/m/d hh:mm';
    default:
      return null;
  }
}

interface StyleTable {
  xml: string;
  /** 数据单元格样式索引 */
  cell: (type: ExcelCellType, precision?: number) => number;
  /** 合计行数值单元格样式索引（无对应样式时回退到普通样式） */
  total: (type: ExcelCellType, precision?: number) => number;
}

/** 扫描所有工作表用到的数字格式，按需生成 cellXfs */
function buildStyleTable(sheets: readonly AnyExcelSheet[]): StyleTable {
  const formats = new Map<string, number>();
  const cellStyles = new Map<string, number>();
  const totalStyles = new Map<string, number>();
  const xfs: string[] = [
    xf(), // 0 默认
    xf({ fontId: 1, fillId: 2, borderId: 1, align: 'center', wrap: true }), // 1 表头
    xf({ borderId: 1, align: 'left', wrap: true }), // 2 文本
    xf({ fontId: 2, align: 'left' }), // 3 标题
    xf({ fontId: 3, align: 'left' }), // 4 说明
    xf({ fontId: 1, fillId: 3, borderId: 1, align: 'left' }), // 5 合计行文字
  ];

  const keyOf = (type: ExcelCellType, precision?: number) => `${type}|${precision ?? ''}`;

  const register = (type: ExcelCellType, precision?: number) => {
    const key = keyOf(type, precision);
    if (cellStyles.has(key)) return;
    const code = numberFormatCode(type, precision);
    if (code === null) {
      cellStyles.set(key, XF_TEXT);
      return;
    }
    let numFmtId = formats.get(code);
    if (numFmtId === undefined) {
      numFmtId = 164 + formats.size;
      formats.set(code, numFmtId);
    }
    const align = type === 'date' || type === 'datetime' ? 'center' : 'right';
    cellStyles.set(key, xfs.length);
    xfs.push(xf({ numFmtId, borderId: 1, align }));
    if (type === 'number' || type === 'currency') {
      totalStyles.set(key, xfs.length);
      xfs.push(xf({ numFmtId, fontId: 1, fillId: 3, borderId: 1, align }));
    }
  };

  for (const sheet of sheets) {
    for (const column of sheet.columns ?? []) {
      register(column.type ?? 'text', column.precision);
    }
  }

  const numFmts =
    formats.size === 0
      ? ''
      : `<numFmts count="${formats.size}">${[...formats.entries()]
          .map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${code}"/>`)
          .join('')}</numFmts>`;

  const xml =
    `${XML_PROLOG}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    numFmts +
    `<fonts count="4">${FONT_NORMAL}${FONT_BOLD}${FONT_TITLE}${FONT_NOTE}</fonts>` +
    `<fills count="4">${FILL_NONE}${FILL_GRAY}${FILL_HEADER}${FILL_TOTAL}</fills>` +
    `<borders count="2">${BORDER_NONE}${BORDER_THIN}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    '</styleSheet>';

  const f = (map: Map<string, number>, type: ExcelCellType, precision?: number) =>
    map.get(keyOf(type, precision)) ?? XF_TEXT;

  return {
    xml,
    cell: (type, precision) => f(cellStyles, type, precision),
    total: (type, precision) => f(totalStyles, type, precision),
  };
}

/* -------------------------------------------------------------------------- */
/* 取值与格式化                                                                */
/* -------------------------------------------------------------------------- */

function readValue(row: unknown, column: AnyExcelSheet['columns'][number]): ExcelValue {
  if (typeof column.value === 'function') {
    return column.value(row);
  }
  if (column.key !== undefined && row !== null && typeof row === 'object') {
    return (row as Record<string, ExcelValue>)[column.key as string];
  }
  return undefined;
}

function toNumber(value: ExcelValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 按 Asia/Shanghai 挂钟时间取年月日时分秒，避免导出结果与页面展示不一致 */
function shanghaiParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

function toDate(value: ExcelValue): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** 转成 Excel 序列号（1900 日期系统） */
function toExcelSerial(value: ExcelValue): number | null {
  const date = toDate(value);
  if (!date) return null;
  const parts = shanghaiParts(date);
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return utc / 86400000 + EXCEL_EPOCH_DAYS;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 用于「自动列宽」的可见文本（与 Excel 显示保持一致，便于估算宽度） */
function displayText(type: ExcelCellType, value: ExcelValue, precision?: number): string {
  if (value === null || value === undefined || value === '') return '';
  switch (type) {
    case 'currency': {
      const num = toNumber(value);
      return num === null ? String(value) : `¥${groupNumber(num, precision)}`;
    }
    case 'number': {
      const num = toNumber(value);
      return num === null ? String(value) : groupNumber(num, precision);
    }
    case 'percent': {
      const num = toNumber(value);
      return num === null ? String(value) : `${(num * 100).toFixed(precision ?? 1)}%`;
    }
    case 'date': {
      const date = toDate(value);
      return date ? formatDate(date.toISOString()) : String(value);
    }
    case 'datetime': {
      const date = toDate(value);
      return date ? formatDateTime(date.toISOString()) : String(value);
    }
    default:
      return value instanceof Date ? formatDateTime(value.toISOString()) : String(value);
  }
}

function groupNumber(value: number, precision?: number): string {
  const decimals = Math.min(Math.max(precision ?? 0, 0), 6);
  return value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** 全角字符按 2 个字符宽度估算 */
function visualWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += /[\u1100-\u115f\u2e80-\ua4cf\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/.test(
      char,
    )
      ? 2
      : 1;
  }
  return width;
}

/* -------------------------------------------------------------------------- */
/* 单元格 / 行 / 工作表                                                        */
/* -------------------------------------------------------------------------- */

function cellXml(ref: string, style: number, type: ExcelCellType, value: ExcelValue): string {
  if (value === null || value === undefined || value === '') {
    // 空值也写出带样式的空单元格，保证表格边框连成一片
    return `<c r="${ref}" s="${style}"/>`;
  }

  if (type === 'boolean') {
    const bool = typeof value === 'string' ? value === 'true' : Boolean(value);
    return `<c r="${ref}" s="${style}" t="b"><v>${bool ? 1 : 0}</v></c>`;
  }

  if (type === 'date' || type === 'datetime') {
    const serial = toExcelSerial(value);
    return serial === null
      ? textCellXml(ref, style, String(value))
      : `<c r="${ref}" s="${style}"><v>${Number(serial.toFixed(6))}</v></c>`;
  }

  if (type === 'number' || type === 'currency' || type === 'percent') {
    const num = toNumber(value);
    if (num === null) return textCellXml(ref, style, String(value));
    // 原始数值原样写入：小数位只影响 Excel 的显示格式，不损失精度（求和仍按真实值）
    return `<c r="${ref}" s="${style}"><v>${num}</v></c>`;
  }

  return textCellXml(ref, style, String(value));
}

function textCellXml(ref: string, style: number, text: string): string {
  const safe = text.length > MAX_CELL_TEXT ? text.slice(0, MAX_CELL_TEXT) : text;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safe)}</t></is></c>`;
}

function rowXml(index: number, cells: readonly string[], height?: number): string {
  const attrs = [`r="${index}"`];
  if (height) attrs.push(`ht="${height}"`, 'customHeight="1"');
  return `<row ${attrs.join(' ')}>${cells.join('')}</row>`;
}

function sheetViewXml(sheetIndex: number, frozenRows: number): string {
  const panes =
    frozenRows > 0
      ? `<pane ySplit="${frozenRows}" topLeftCell="A${frozenRows + 1}" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="A${frozenRows + 1}" sqref="A${frozenRows + 1}"/>`
      : '';
  const selected = sheetIndex === 0 ? ' tabSelected="1"' : '';
  return `<sheetViews><sheetView${selected} workbookViewId="0">${panes}</sheetView></sheetViews>`;
}

interface ColumnMeta {
  column: AnyExcelSheet['columns'][number];
  type: ExcelCellType;
  precision?: number;
  style: number;
  totalStyle: number;
  width: number;
}

function buildSheetXml(sheet: AnyExcelSheet, sheetIndex: number, styles: StyleTable): string {
  const columns = sheet.columns ?? [];
  const rows = sheet.rows ?? [];
  const headerRow = (sheet.title ? 1 : 0) + (sheet.note ? 1 : 0) + 1;
  const firstDataRow = headerRow + 1;
  const lastDataRow = firstDataRow + rows.length - 1;
  const totalEnabled = Boolean(sheet.total) && rows.length > 0;
  const totalRowIndex = totalEnabled ? lastDataRow + 1 : 0;
  const lastRow = totalRowIndex || Math.max(lastDataRow, headerRow);
  const lastColumnLetter = columns.length > 0 ? columnLetter(columns.length - 1) : 'A';

  // 列元信息（样式 + 列宽）
  const metas: ColumnMeta[] = columns.map((column) => {
    const type = column.type ?? 'text';
    const precision = column.precision;
    let width = column.width ?? 0;
    if (!width) {
      let longest = visualWidth(column.title);
      for (const row of rows) {
        longest = Math.max(longest, visualWidth(displayText(type, readValue(row, column), precision)));
      }
      // 数字列留出千分位与货币符号的空间
      const padding = type === 'currency' ? 6 : type === 'number' || type === 'percent' ? 4 : 3;
      width = Math.min(Math.max(longest + padding, 10), 48);
    }
    return {
      column,
      type,
      precision,
      style: styles.cell(type, precision),
      totalStyle: styles.total(type, precision),
      width,
    };
  });

  const parts: string[] = [XML_PROLOG];
  parts.push(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
  );
  parts.push(`<dimension ref="A1:${lastColumnLetter}${lastRow}"/>`);
  parts.push(sheetViewXml(sheetIndex, sheet.freezeHeader === false ? 0 : headerRow));
  parts.push('<sheetFormatPr defaultRowHeight="18"/>');

  if (metas.length > 0) {
    parts.push(
      `<cols>${metas
        .map((meta, index) => `<col min="${index + 1}" max="${index + 1}" width="${meta.width}" customWidth="1"/>`)
        .join('')}</cols>`,
    );
  }

  const rowXmlList: string[] = [];

  if (sheet.title) {
    rowXmlList.push(rowXml(1, [textCellXml('A1', XF_TITLE, sheet.title)], 26));
  }
  if (sheet.note) {
    const noteRow = sheet.title ? 2 : 1;
    rowXmlList.push(rowXml(noteRow, [textCellXml(`A${noteRow}`, XF_NOTE, sheet.note)], 18));
  }

  rowXmlList.push(
    rowXml(
      headerRow,
      metas.map((meta, index) => textCellXml(`${columnLetter(index)}${headerRow}`, XF_HEADER, meta.column.title)),
      24,
    ),
  );

  rows.forEach((row, rowIndex) => {
    const rowNumber = firstDataRow + rowIndex;
    rowXmlList.push(
      rowXml(
        rowNumber,
        metas.map((meta, columnIndex) =>
          cellXml(`${columnLetter(columnIndex)}${rowNumber}`, meta.style, meta.type, readValue(row, meta.column)),
        ),
      ),
    );
  });

  if (totalRowIndex > 0) {
    rowXmlList.push(
      rowXml(
        totalRowIndex,
        metas.map((meta, columnIndex) => {
          const ref = `${columnLetter(columnIndex)}${totalRowIndex}`;
          if (columnIndex === 0) {
            return textCellXml(ref, XF_TOTAL_LABEL, sheet.totalLabel ?? '合计');
          }
          if (meta.type !== 'number' && meta.type !== 'currency') {
            return `<c r="${ref}" s="${XF_TOTAL_LABEL}"/>`;
          }
          const sum = rows.reduce((acc, row) => acc + (toNumber(readValue(row, meta.column)) ?? 0), 0);
          return cellXml(ref, meta.totalStyle, meta.type, sum);
        }),
        totalEnabled ? 22 : undefined,
      ),
    );
  }

  parts.push(`<sheetData>${rowXmlList.join('')}</sheetData>`);

  if (sheet.autoFilter !== false && metas.length > 0) {
    const filterEnd = Math.max(lastDataRow, headerRow);
    parts.push(`<autoFilter ref="A${headerRow}:${lastColumnLetter}${filterEnd}"/>`);
  }

  const merges: string[] = [];
  if (sheet.title && metas.length > 1) merges.push(`A1:${lastColumnLetter}1`);
  if (sheet.note) {
    const noteRow = sheet.title ? 2 : 1;
    if (metas.length > 1) merges.push(`A${noteRow}:${lastColumnLetter}${noteRow}`);
  }
  if (merges.length > 0) {
    parts.push(`<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`);
  }

  parts.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>');
  parts.push('</worksheet>');

  return parts.join('');
}

/* -------------------------------------------------------------------------- */
/* 工作簿组装                                                                  */
/* -------------------------------------------------------------------------- */

function sanitizeSheetName(name: string, index: number): string {
  const cleaned = (name || `工作表${index + 1}`)
    .replace(/[[\]:*?/\\]/g, '-')
    .replace(/['\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);
  return cleaned || `工作表${index + 1}`;
}

function uniqueSheetNames(sheets: readonly AnyExcelSheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((sheet, index) => {
    const base = sanitizeSheetName(sheet.name, index);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      const tail = `(${suffix})`;
      candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
      suffix += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

function contentTypesXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ` +
      `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  return (
    `${XML_PROLOG}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets +
    '<Override PartName="/xl/styles.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ' +
    'ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>'
  );
}

function rootRelsXml(): string {
  return (
    `${XML_PROLOG}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    '<Relationship Id="rId1" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
    'Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" ' +
    'Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" ' +
    'Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" ' +
    'Target="docProps/app.xml"/>' +
    '</Relationships>'
  );
}

/** 文档属性（标题 / 作者 / 创建时间）：真实 Office 文件都有，缺失时部分阅读器会提示「文件已损坏」 */
function corePropsXml(title: string, creator: string, created: Date): string {
  const iso = created.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return (
    `${XML_PROLOG}<cp:coreProperties ` +
    'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escapeXml(title)}</dc:title>` +
    `<dc:creator>${escapeXml(creator)}</dc:creator>` +
    `<cp:lastModifiedBy>${escapeXml(creator)}</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    '</cp:coreProperties>'
  );
}

/** 扩展属性：工作表清单，Excel 的「属性 → 内容」里会显示 */
function appPropsXml(sheetNames: readonly string[]): string {
  const titles = sheetNames.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join('');
  return (
    `${XML_PROLOG}<Properties ` +
    'xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>云枢运营平台</Application>' +
    '<DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>' +
    '<HeadingPairs><vt:vector size="2" baseType="variant">' +
    '<vt:variant><vt:lpstr>工作表</vt:lpstr></vt:variant>' +
    `<vt:variant><vt:i4>${sheetNames.length}</vt:i4></vt:variant>` +
    '</vt:vector></HeadingPairs>' +
    `<TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${titles}</vt:vector></TitlesOfParts>` +
    '<Company>云枢科技</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc>' +
    '<HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion>' +
    '</Properties>'
  );
}

function workbookRelsXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" ` +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
      `Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');
  return (
    `${XML_PROLOG}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets +
    `<Relationship Id="rId${sheetCount + 1}" ` +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>'
  );
}

function workbookXml(names: readonly string[]): string {
  const sheets = names
    .map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('');
  return (
    `${XML_PROLOG}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<workbookPr/><bookViews><workbookView activeTab="0"/></bookViews>' +
    `<sheets>${sheets}</sheets>` +
    '</workbook>'
  );
}

function isSheetArray(input: AnyExcelWorkbook | readonly AnyExcelSheet[]): input is readonly AnyExcelSheet[] {
  return Array.isArray(input);
}

function normalizeSheets(input: AnyExcelWorkbook | readonly AnyExcelSheet[]): AnyExcelSheet[] {
  const sheets = isSheetArray(input) ? [...input] : [...input.sheets];
  if (sheets.length === 0) {
    throw new Error('[xlsx] 至少需要一个工作表，无法导出空工作簿');
  }
  return sheets;
}

/**
 * 生成 .xlsx 字节流（纯计算，浏览器 / Node 均可调用，便于单测与校验）
 * @param options.now 工作簿创建时间（同时用于 ZIP 时间戳），传固定值可得到确定性产物
 */
export function buildExcelBytes(
  input: AnyExcelWorkbook | readonly AnyExcelSheet[],
  options: { now?: Date; creator?: string } = {},
): Uint8Array<ArrayBuffer> {
  const sheets = normalizeSheets(input);
  const names = uniqueSheetNames(sheets);
  const styles = buildStyleTable(sheets);
  const now = options.now ?? new Date();
  const creator = options.creator ?? '云枢运营平台';
  const documentTitle = sheets[0]?.title ?? sheets[0]?.name ?? '导出数据';

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: utf8(contentTypesXml(sheets.length)) },
    { name: '_rels/.rels', data: utf8(rootRelsXml()) },
    { name: 'docProps/core.xml', data: utf8(corePropsXml(documentTitle, creator, now)) },
    { name: 'docProps/app.xml', data: utf8(appPropsXml(names)) },
    { name: 'xl/workbook.xml', data: utf8(workbookXml(names)) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRelsXml(sheets.length)) },
    { name: 'xl/styles.xml', data: utf8(styles.xml) },
  ];

  sheets.forEach((sheet, index) => {
    entries.push({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: utf8(buildSheetXml(sheet, index, styles)),
    });
  });

  return createZip(entries, now);
}

/** 生成 Excel MIME 的 Blob（可直接交给下载 / 上传逻辑） */
export function buildExcelBlob(input: AnyExcelWorkbook | readonly AnyExcelSheet[]): Blob {
  return new Blob([buildExcelBytes(input)], { type: EXCEL_MIME });
}

/**
 * 把任意文本（图表名 / 表名）清洗成安全的文件名主体：
 * 去掉扩展名、路径分隔符与 Windows 非法字符，压缩空白与重复连字符，
 * 并保证**永远不会只剩下扩展名**（否则 Windows / Excel 会判定文件名非法而打不开）。
 */
function sanitizeFileBase(raw: string): string {
  return raw
    .replace(/\.xlsx$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '')
    .trim()
    .slice(0, 80)
    .trim();
}

/** 清洗文件名并拼上导出日期（`客户清单` → `客户清单-20240517.xlsx`；已带日期则不重复追加） */
export function excelFileName(base?: string, now: Date = new Date()): string {
  const safe = sanitizeFileBase(base ?? '') || '导出数据';
  if (/-\d{8}$/.test(safe)) {
    return `${safe}${EXCEL_EXTENSION}`;
  }
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  return `${safe}-${stamp}${EXCEL_EXTENSION}`;
}

/**
 * 决定落盘文件名，优先级：
 * 显式 `fileName`（按钮传入）→ 工作簿 `fileName` → **首个工作表的 `title`（用户看到的图表名）** → 工作表 `name`
 */
export function resolveExcelFileName(
  input: AnyExcelWorkbook | readonly AnyExcelSheet[],
  fileName?: string,
  now: Date = new Date(),
): string {
  const sheets = normalizeSheets(input);
  const explicit = fileName?.trim() ? fileName : undefined;
  const fromWorkbook = isSheetArray(input) ? undefined : input.fileName;
  const base = explicit ?? fromWorkbook ?? sheets[0]?.title ?? sheets[0]?.name;
  return excelFileName(base, now);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  (document.body ?? document.documentElement).appendChild(anchor);
  anchor.click();
  // 先不移除节点、也不立刻回收 URL：过早移除/revoke 会让部分浏览器写出 0 字节或截断的文件
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 15000);
}

/**
 * 本地导出：在浏览器里生成 .xlsx 并触发下载（纯前端，不经服务端）。
 * 文件名完全由 `a[download]` 决定，不经过系统「另存为」对话框 —— 这是兼容性最好、文件名最可控的路径。
 * @returns 实际使用的文件名
 */
export function downloadExcel(
  input: AnyExcelWorkbook | readonly AnyExcelSheet[],
  fileName?: string,
): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('[xlsx] downloadExcel 只能在浏览器环境中调用，服务端请用 buildExcelBytes');
  }
  const name = resolveExcelFileName(input, fileName);
  triggerDownload(buildExcelBlob(input), name);
  return name;
}

interface FilePickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    name?: string;
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

/**
 * 「另存为」导出（可选能力，默认不走）：调用 File System Access API 让用户选择本地保存位置。
 *
 * ⚠️ 这条路径会把文件名的最终决定权交给系统「另存为」对话框 —— 如果对话框里的名字被清空，
 * 落盘文件可能只剩下扩展名（如 `.xlsx`），而 Windows / Excel / WPS 会判定这种文件名非法而拒绝打开。
 * 因此这里对句柄返回的真实文件名做了校验：一旦发现「只有扩展名」，就改用普通下载兜底。
 *
 * @returns 实际保存的文件名；用户主动取消返回 null
 */
export async function saveExcelFile(
  input: AnyExcelWorkbook | readonly AnyExcelSheet[],
  fileName?: string,
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('[xlsx] saveExcelFile 只能在浏览器环境中调用');
  }
  const name = resolveExcelFileName(input, fileName);
  const picker = (window as FilePickerWindow).showSaveFilePicker;
  if (!picker) {
    triggerDownload(buildExcelBlob(input), name);
    return name;
  }
  try {
    const handle = await picker({
      suggestedName: name,
      types: [{ description: 'Excel 工作簿', accept: { [EXCEL_MIME]: [EXCEL_EXTENSION] } }],
    });
    // 句柄给出的才是真正落盘的名字：只有扩展名（或空白）时不能用它，退回普通下载
    const savedName = typeof handle.name === 'string' ? handle.name.trim() : '';
    const savedBase = savedName.replace(/\.xlsx$/i, '');
    if (!savedName || !savedBase || /^[.\s-]+$/.test(savedBase)) {
      triggerDownload(buildExcelBlob(input), name);
      return name;
    }
    const writable = await handle.createWritable();
    await writable.write(buildExcelBlob(input));
    await writable.close();
    return savedName;
  } catch (error) {
    if ((error as DOMException | undefined)?.name === 'AbortError') return null;
    // 非用户取消（权限 / 安全策略等）时退回普通下载，保证功能可用
    triggerDownload(buildExcelBlob(input), name);
    return name;
  }
}
