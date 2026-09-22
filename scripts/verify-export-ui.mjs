/**
 * 导出链路端到端验证（无头浏览器 + CDP）
 * ---------------------------------------------------------------------------
 * 真的去点每个页面的「导出」按钮，确认：
 *   1) 点击后浏览器把 .xlsx 落到本地下载目录（本地导出，不经服务端）
 *   2) 落盘文件是合法 ZIP（PK 头）+ 工作表数量与预期一致
 *   3) 全程没有控制台 error / 未捕获异常
 *
 * 用法：
 *   1. 启动应用：npm run build && npm start（或 npm run dev）
 *   2. 另开终端启动无头浏览器：
 *      & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
 *        --headless=new --disable-gpu --remote-debugging-port=9222 `
 *        --user-data-dir="$PWD\.tmp\edge-profile" about:blank
 *   3. node scripts/verify-export-ui.mjs
 *
 * 可用环境变量：CDP_PORT（9222）、BASE_URL（http://localhost:3000）、DOWNLOAD_DIR（.tmp/downloads）
 */
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const CDP_PORT = process.env.CDP_PORT ?? '9222';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR ?? '.tmp/downloads');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
        return;
      }
      this.listeners.forEach((listener) => listener(message));
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  onMessage(listener) {
    this.listeners.push(listener);
  }

  close() {
    this.ws.close();
  }
}

/** 从 ZIP 中央目录读出部件名（用于断言工作表数量） */
function zipEntryNames(bytes) {
  const decoder = new TextDecoder();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  if (view.getUint32(end, true) !== 0x06054b50) throw new Error('不是合法 ZIP（缺少 EOCD）');
  const total = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const names = [];
  for (let index = 0; index < total; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('中央目录头签名错误');
    const nameLength = view.getUint16(offset + 28, true);
    names.push(decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return names;
}

const TASKS = [
  { path: '/', label: '导出报表', expectSheets: 5, note: '工作台经营概览' },
  { path: '/analytics', label: '下载分析报告', expectSheets: 7, note: '数据分析报告（默认浏览器下载）' },
  { path: '/', label: '导出', exact: true, expectSheets: 1, note: '趋势图导出（图表名=成交趋势）' },
  { path: '/analytics', label: '导出', exact: true, expectSheets: 1, note: '趋势图导出（图表名=成交趋势（全渠道））' },
  { path: '/orders', label: '导出筛选结果', expectSheets: 1, note: '订单筛选结果' },
  { path: '/orders', label: '导出所选', selectRow: true, expectSheets: 1, note: '订单勾选导出' },
  { path: '/customers', label: '导出客户', expectSheets: 1, note: '客户清单' },
  { path: '/products', label: '导出商品', expectSheets: 2, note: '商品清单 + 销量贡献' },
];

async function main() {
  await rm(DOWNLOAD_DIR, { recursive: true, force: true });
  await mkdir(DOWNLOAD_DIR, { recursive: true });

  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();

  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: DOWNLOAD_DIR,
    eventsEnabled: true,
  });

  /* 浏览器自己上报的下载事件：suggestedFilename 是浏览器最终采用的文件名，
     state 必须走到 completed，否则说明下载被中断 / 写入了不完整文件 */
  const downloads = [];
  cdp.onMessage((message) => {
    if (message.method === 'Browser.downloadWillBegin') {
      downloads.push({ guid: message.params.guid, suggested: message.params.suggestedFilename, state: 'begin' });
    }
    if (message.method === 'Browser.downloadProgress') {
      const item = downloads.find((entry) => entry.guid === message.params.guid);
      if (item) {
        item.state = message.params.state;
        item.received = message.params.receivedBytes ?? item.received;
        item.total = message.params.totalBytes ?? item.total;
      }
    }
  });

  console.log(`浏览器: ${version.Browser}`);
  console.log(`下载目录: ${DOWNLOAD_DIR}\n`);

  let failures = 0;

  for (const task of TASKS) {
    const before = new Set(await readdir(DOWNLOAD_DIR));

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    const errors = [];
    cdp.onMessage((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push((message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? '').join(' '));
      }
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails?.exception?.description ?? 'unknown exception');
      }
    });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);

    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, 15000);
      cdp.onMessage((message) => {
        if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    await cdp.send('Page.navigate', { url: `${BASE_URL}${task.path}` }, sessionId);
    await loaded;
    await sleep(2500);

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? '页面脚本异常');
      return result.result?.value;
    };

    // 勾选第一行（验证「导出所选」）
    if (task.selectRow) {
      await evaluate(
        'document.querySelector(".ant-table-tbody .ant-checkbox-input")?.click(); "ok"',
      );
      await sleep(300);
    }

    const clicked = await evaluate(`(() => {
      const label = ${JSON.stringify(task.label)};
      const buttons = [...document.querySelectorAll('.ant-btn')];
      const target = buttons.find((btn) => ${
        task.exact ? 'btn.textContent.trim() === label' : 'btn.textContent.includes(label)'
      });
      if (!target) return 'not-found';
      if (target.disabled) return 'disabled';
      target.click();
      return 'clicked';
    })()`);

    let file = null;
    let problem = clicked === 'clicked' ? null : `按钮状态：${clicked}`;
    const download = downloads.at(-1);
    let browserName = download?.suggested ?? '(无下载事件)';

    if (clicked === 'clicked') {
      const deadline = Date.now() + 15000;
      let lastLength = -1;
      let stableTicks = 0;
      while (Date.now() < deadline && !file) {
        await sleep(250);
        const now = await readdir(DOWNLOAD_DIR);
        const fresh = now.filter((name) => !before.has(name) && !name.endsWith('.crdownload'));
        if (fresh.length > 0) {
          const candidate = path.join(DOWNLOAD_DIR, fresh[0]);
          const length = (await stat(candidate)).size;
          // 文件大小连续两次不变才认为写盘结束（避免读到写了一半的文件）
          stableTicks = length === lastLength ? stableTicks + 1 : 0;
          lastLength = length;
          if (stableTicks >= 1) file = fresh[0];
        }
      }
      if (!file) problem = '15 秒内没有文件落盘';
      // 浏览器上报的最终状态：interrupted / canceled 都意味着「文件不完整」
      // （blob 下载在部分 Chrome 版本不发 downloadProgress，此时保持 begin，不算失败）
      if (download && ['interrupted', 'canceled'].includes(download.state)) {
        problem = `浏览器下载状态为 ${download.state}（未完成）`;
      }
      // 浏览器采用的文件名必须与预期一致，且不能只有扩展名
      const expected = download?.suggested;
      if (expected) {
        const base = expected.replace(/\.xlsx$/i, '');
        if (!base || /^[.\s-]+$/.test(base)) problem = `浏览器采用的文件名只有扩展名：${expected}`;
      }
      if (browserName && file && browserName !== file) {
        problem = `浏览器采用的文件名(${browserName})与落盘文件名(${file})不一致`;
      }
    }

    let sheetCount = 0;
    let size = 0;
    if (file) {
      const full = path.join(DOWNLOAD_DIR, file);
      const bytes = await readFile(full);
      size = (await stat(full)).size;
      // 文件名必须「有主名」：只有扩展名的文件（如 .xlsx）在 Windows / Excel 里会被判定非法而打不开
      const baseName = file.replace(/\.xlsx$/i, '');
      if (!baseName || /^[.\s-]+$/.test(baseName)) {
        problem = `文件名不合法，只有扩展名：${file}`;
      }
      try {
        if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw new Error('缺少 ZIP 头（PK）');
        if (bytes.length < 1024) throw new Error(`文件过小（${bytes.length} 字节），可能写入不完整`);
        const names = zipEntryNames(bytes);
        sheetCount = names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length;
        if (sheetCount !== task.expectSheets) {
          problem = `工作表数量 ${sheetCount} ≠ 预期 ${task.expectSheets}`;
        }
      } catch (error) {
        problem = `文件校验失败：${error.message}`;
      }
    }

    if (errors.length > 0) problem = `${problem ? `${problem}；` : ''}控制台报错 ${errors.length} 条`;
    if (problem) failures += 1;

    console.log(
      [
        (problem ? '✗' : '✓').padEnd(2),
        task.path.padEnd(11),
        task.note.padEnd(30),
        (file ?? '(无文件)').padEnd(40),
        `${(size / 1024).toFixed(1)}KB`.padEnd(9),
        `sheets=${sheetCount}`,
        `download=${download?.state ?? '-'}`,
        problem ? `→ ${problem}` : '',
      ].join(' '),
    );
    if (browserName !== file) console.log(`     浏览器采用的文件名: ${browserName}`);
    errors.slice(0, 3).forEach((text) => console.log(`     ERROR: ${text.slice(0, 200)}`));

    await cdp.send('Target.closeTarget', { targetId });
  }

  cdp.close();
  console.log(failures === 0 ? '\n全部导出链路 OK' : `\n${failures} 个导出场景有问题`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('导出验证脚本失败:', error);
  process.exitCode = 1;
});
