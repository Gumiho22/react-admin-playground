/**
 * 极简 ZIP 打包器（store 模式：只做封装、不做压缩）
 *
 * 为什么自己写：一份 .xlsx 本质就是「一堆 XML + ZIP 容器」，引入 SheetJS / ExcelJS
 * 这类库会带来几百 KB 的客户端体积（以及 npm 上已停更的版本风险）。
 * 这里只需要写入能力，用 ZIP 的 store（不压缩）方式即可被 Excel / WPS / Numbers 正常打开，
 * 全量代码不到 150 行，零依赖、可同时在浏览器与 Node 里跑。
 *
 * 文件结构（写出的字节顺序与规范一致）：
 *   [local file header + data] * n  →  [central directory header] * n  →  [end of central directory]
 */

/** CRC32（IEEE 802.3，反射多项式 0xEDB88320）查表 */
const CRC_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

/** 计算字节的 CRC32 校验值 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ (bytes[i] as number)) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** 包内路径，统一使用 `/` 分隔，例如 `xl/worksheets/sheet1.xml` */
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_SIGNATURE = 0x06054b50;
/** 通用位标记 bit 11：文件名按 UTF-8 编码 */
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const VERSION = 20;

/** 合并多个 Uint8Array */
function concat(chunks: readonly Uint8Array[], totalLength: number): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/** 转换为 MS-DOS 时间/日期格式（ZIP 头固定使用该格式） */
function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

/**
 * 把若干文件打包成 ZIP 字节流。
 * `now` 仅用于写入 ZIP 头里的时间戳，默认取当前时间。
 */
export function createZip(entries: readonly ZipEntry[], now: Date = new Date()): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);

  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
    localView.setUint16(4, VERSION, true);
    localView.setUint16(6, UTF8_FLAG, true);
    localView.setUint16(8, STORE_METHOD, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    body.push(local, entry.data);

    const dir = new Uint8Array(46 + nameBytes.length);
    const dirView = new DataView(dir.buffer);
    dirView.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
    dirView.setUint16(4, VERSION, true);
    dirView.setUint16(6, VERSION, true);
    dirView.setUint16(8, UTF8_FLAG, true);
    dirView.setUint16(10, STORE_METHOD, true);
    dirView.setUint16(12, time, true);
    dirView.setUint16(14, date, true);
    dirView.setUint32(16, crc, true);
    dirView.setUint32(20, size, true);
    dirView.setUint32(24, size, true);
    dirView.setUint16(28, nameBytes.length, true);
    dirView.setUint16(30, 0, true);
    dirView.setUint16(32, 0, true);
    dirView.setUint16(34, 0, true);
    dirView.setUint16(36, 0, true);
    dirView.setUint32(38, 0, true);
    dirView.setUint32(42, offset, true);
    dir.set(nameBytes, 46);
    central.push(dir);

    offset += local.length + size;
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_OF_CENTRAL_SIGNATURE, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concat([...body, ...central, end], offset + centralSize + end.length);
}
