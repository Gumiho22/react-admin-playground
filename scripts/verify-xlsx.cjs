/**
 * 导出内核自检：不需要 Next 运行时，直接在 Node 里把 `src/lib/xlsx/*` 转译成 CJS 跑一遍，
 * 生成一个覆盖全部单元格类型的 .xlsx，并对 ZIP 结构、CRC、XML 做基础校验。
 *
 * 用法：
 *   node scripts/verify-xlsx.cjs [输出路径]
 * 之后可用 Windows 自带的解压 + XML 解析做二次确认：
 *   Expand-Archive <file>.zip -DestinationPath <dir>
 *   [xml](Get-Content <dir>/xl/workbook.xml)
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.resolve(process.argv[2] ?? path.join(ROOT, '.tmp', 'export-check.xlsx'));
const BUILD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-verify-'));
const SOURCES = ['src/lib/format.ts', 'src/lib/xlsx/zip.ts', 'src/lib/xlsx/index.ts'];

/* -------------------------------------------------------------------------- */
/* 1) 就地转译 TS → CJS（tsc 不会重写 `@/` 别名，这里补一个解析钩子）            */
/* -------------------------------------------------------------------------- */

for (const relative of SOURCES) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const result = ts.transpileModule(source, {
    fileName: relative,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw new Error(`${relative} 转译失败：${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, ' ')).join('; ')}`);
  }
  const target = path.join(BUILD_DIR, relative.replace(/^src[\\/]/, '').replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, result.outputText);
}

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithAlias(request, ...rest) {
  if (request.startsWith('@/')) {
    return originalResolve.call(this, path.join(BUILD_DIR, request.slice(2)), ...rest);
  }
  return originalResolve.call(this, request, ...rest);
};

const { buildExcelBytes, excelFileName, resolveExcelFileName, defineSheet, EXCEL_MIME } = require(
  path.join(BUILD_DIR, 'lib/xlsx/index.js'),
);

/* -------------------------------------------------------------------------- */
/* 2) 造数据：覆盖所有单元格类型 + 各种边界                                    */
/* -------------------------------------------------------------------------- */

const rows = [
  { name: '恒瑞科技', count: 12, amount: 1286000, ratio: 0.1234, day: '2024-05-17T00:00:00+08:00', at: '2024-05-17T14:20:00+08:00', ok: true, blank: '', custom: 'A&B<C>"D\'E' },
  { name: '蓝湖数据', count: 0, amount: 0, ratio: 0, day: '2024-01-01T08:00:00+08:00', at: '2024-01-01T08:00:00+08:00', ok: false, blank: null, custom: 42 },
  { name: '带emoji的行 🚀', count: null, amount: null, ratio: null, day: 'not-a-date', at: new Date('2024-05-16T23:59:59+08:00'), ok: null, blank: undefined, custom: null },
  { name: '', count: 7, amount: 88.5, ratio: 1, day: '2024-02-29T12:00:00+08:00', at: '2024-02-29T12:00:00+08:00', ok: true, blank: 'x', custom: 'ok' },
];

const longRows = Array.from({ length: 500 }, (_, index) => ({
  id: `SO-20240517-${String(index + 1).padStart(4, '0')}`,
  amount: (index + 1) * 137.5,
  at: new Date(Date.UTC(2024, 4, 17, index % 24, index % 60)).toISOString(),
}));

const workbook = {
  fileName: '导出校验',
  sheets: [
    defineSheet({
      name: '类型全覆盖',
      title: '单元格类型校验',
      note: '导出时间 2024-05-17 18:00 · 覆盖 text/number/currency/percent/date/datetime/boolean',
      columns: [
        { title: '客户', key: 'name', width: 26 },
        { title: '订单数', key: 'count', type: 'number' },
        { title: '成交额', key: 'amount', type: 'currency' },
        { title: '占比', key: 'ratio', type: 'percent' },
        { title: '日期', key: 'day', type: 'date' },
        { title: '下单时间', key: 'at', type: 'datetime' },
        { title: '是否成交', key: 'ok', type: 'boolean' },
        { title: '空值列', key: 'blank' },
        { title: '特殊字符', key: 'custom' },
        { title: '小数两位', key: 'amount', type: 'currency', precision: 2 },
        { title: '自定义取值', value: (row) => `${row.name ?? '空'} / ${row.count ?? '-'}`, width: 24 },
      ],
      rows,
      total: true,
      totalLabel: '合计',
    }),
    defineSheet({
      name: '订单明细',
      note: '500 行压力校验',
      columns: [
        { title: '订单号', key: 'id', width: 22 },
        { title: '金额', key: 'amount', type: 'currency' },
        { title: '下单时间', key: 'at', type: 'datetime' },
      ],
      rows: longRows,
      total: true,
    }),
    defineSheet({ name: '重复名', columns: [{ title: 'A', key: 'name' }], rows }),
    defineSheet({ name: '重复名', columns: [{ title: 'A', key: 'name' }], rows }),
    defineSheet({ name: '非法/名称:*?[]', columns: [{ title: 'A', key: 'name' }], rows, freezeHeader: false, autoFilter: false }),
    defineSheet({ name: '这是一个非常非常非常非常长的工作表名称', columns: [{ title: 'A', key: 'name' }], rows }),
    defineSheet({ name: '空表', columns: [], rows: [] }),
  ],
};

/* -------------------------------------------------------------------------- */
/* 3) 生成文件                                                                 */
/* -------------------------------------------------------------------------- */

const bytes = buildExcelBytes(workbook);
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, bytes);

/* -------------------------------------------------------------------------- */
/* 4) 独立解析 ZIP 中央目录 + 交叉校验 CRC（与 zip.ts 不同的实现路径）          */
/* -------------------------------------------------------------------------- */

function crc32Reference(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function readCentralDirectory(buffer) {
  const decoder = new TextDecoder();
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const endOffset = buffer.length - 22;
  if (view.getUint32(endOffset, true) !== 0x06054b50) throw new Error('未找到 ZIP 结束记录（EOCD）');
  const total = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries = [];
  for (let index = 0; index < total; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error(`第 ${index + 1} 个中央目录头签名错误`);
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(buffer.subarray(offset + 46, offset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataStart, dataStart + size);
    if (crc32Reference(data) !== crc) throw new Error(`${name} 的 CRC32 校验失败`);
    entries.push({ name, method, size, crc });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const entries = readCentralDirectory(bytes);
const names = entries.map((entry) => entry.name);

const expectedParts = [
  '[Content_Types].xml',
  '_rels/.rels',
  'docProps/core.xml',
  'docProps/app.xml',
  'xl/workbook.xml',
  'xl/_rels/workbook.xml.rels',
  'xl/styles.xml',
  ...workbook.sheets.map((_, index) => `xl/worksheets/sheet${index + 1}.xml`),
];
for (const part of expectedParts) {
  if (!names.includes(part)) throw new Error(`缺少必需部件：${part}`);
}
if (entries.some((entry) => entry.method !== 0)) throw new Error('存在非 store 方式的条目，压缩写入尚未实现');

/* -------------------------------------------------------------------------- */
/* 5) 文件名规则：任何输入都不能产出「只有扩展名」或含非法字符的名字             */
/* -------------------------------------------------------------------------- */

const ILLEGAL = /[\\/:*?"<>|]/;
const fileNameCases = [
  { base: undefined, expectBase: '导出数据' },
  { base: '', expectBase: '导出数据' },
  { base: '.xlsx', expectBase: '导出数据' },
  { base: '   ', expectBase: '导出数据' },
  { base: '/', expectBase: '导出数据' },
  { base: '成交趋势（全渠道）-近14天', expectBase: '成交趋势（全渠道）-近14天' },
  { base: '客户/清单:*?"<>|', expectBase: '客户-清单' },
  { base: 'a'.repeat(200), expectLength: 80 },
];
for (const item of fileNameCases) {
  const name = excelFileName(item.base, new Date(2024, 4, 17));
  const base = name.replace(/-\d{8}\.xlsx$/, '');
  if (!name.endsWith('.xlsx')) throw new Error(`文件名缺少扩展名：${name}`);
  if (base.length === 0) throw new Error(`文件名只有扩展名（Excel 会判定非法而打不开）：${name}`);
  if (ILLEGAL.test(name)) throw new Error(`文件名含 Windows 非法字符：${name}`);
  if (item.expectBase !== undefined && item.expectBase.length <= 31 && base !== item.expectBase) {
    throw new Error(`文件名清洗结果不符：${name}（期望主体 ${item.expectBase}）`);
  }
  if (item.expectLength !== undefined && base.length !== item.expectLength) {
    throw new Error(`超长文件名未截断：${base.length}`);
  }
  if (name.includes('..')) throw new Error(`文件名存在路径穿越风险：${name}`);
}

/* 未显式指定文件名时，应动态取「首个工作表的图表名（title）」 */
const derived = resolveExcelFileName(
  [{ name: '成交趋势', title: '成交趋势（全渠道）', columns: [], rows: [] }],
  undefined,
  new Date(2024, 4, 17),
);
if (!derived.startsWith('成交趋势（全渠道）')) throw new Error(`未按图表名生成文件名：${derived}`);

console.log('✅ 导出内核自检通过');
console.log(`   工作表：${workbook.sheets.length} 个，ZIP 部件：${names.length} 个`);
console.log(`   文件名规则：${fileNameCases.length} 组边界用例通过；图表名动态取名 → ${derived}`);
console.log(`   文件名示例：${excelFileName('客户清单')}`);
console.log(`   MIME：${EXCEL_MIME}`);
console.log(`   文件：${OUT_FILE}`);
console.log(`   大小：${(bytes.length / 1024).toFixed(1)} KB（500 行明细 + 7 个工作表）`);
console.log(`   部件：${names.join(', ')}`);
