/**
 * UI 冒烟验证脚本（Windows + Edge/Chrome headless）
 * ---------------------------------------------------------------------------
 * 通过 Chrome DevTools Protocol 直连无头浏览器，对每个路由：
 *   1) 等待页面加载 + hydration + ECharts 首帧
 *   2) 断言关键 DOM（ECharts canvas 数量、antd 表格行数、主题属性）
 *   3) 收集控制台 error / warning 与未捕获异常（hydration 不匹配会在这里暴露）
 *   4) 截图保存到 screenshots/
 *
 * 用法：
 *   1. 先启动应用（npm run dev 或 npm run build && npm start）
 *   2. 另开一个终端启动无头浏览器：
 *      & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
 *        --headless=new --disable-gpu --remote-debugging-port=9222 `
 *        --user-data-dir="$PWD\.edge-profile" about:blank
 *   3. node scripts/ui-smoke.mjs
 *
 * 可用环境变量：CDP_PORT（默认 9222）、BASE_URL（默认 http://localhost:3000）
 */
import { mkdir, writeFile } from 'node:fs/promises';

const CDP_PORT = process.env.CDP_PORT ?? '9222';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
/** 传 THEME=dark 可在加载前写入本地偏好，用于验证深色主题 */
const THEME = process.env.THEME;

const ROUTES = [
  { path: '/', expectCanvas: 6, expectTable: 0 },
  { path: '/analytics', expectCanvas: 4, expectTable: 0 },
  { path: '/orders', expectCanvas: 0, expectTable: 1 },
  { path: '/customers', expectCanvas: 0, expectTable: 1 },
  { path: '/products', expectCanvas: 1, expectTable: 1 },
  { path: '/settings', expectCanvas: 0, expectTable: 0 },
];

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

async function main() {
  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();

  await mkdir('screenshots', { recursive: true });

  let failures = 0;

  for (const route of ROUTES) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    const consoleErrors = [];
    const consoleWarnings = [];
    cdp.onMessage((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = (message.params.args ?? [])
          .map((arg) => arg.value ?? arg.description ?? '')
          .join(' ');
        if (message.params.type === 'error') consoleErrors.push(text);
        if (message.params.type === 'warning') consoleWarnings.push(text);
      }
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? 'unknown exception');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        consoleErrors.push(`${message.params.entry.text}${message.params.entry.url ? ` <- ${message.params.entry.url}` : ''}`);
      }
    });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    if (THEME) {
      await cdp.send(
        'Page.addScriptToEvaluateOnNewDocument',
        { source: `try{localStorage.setItem('b-admin:theme','${THEME}')}catch(e){}` },
        sessionId,
      );
    }
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );

    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, 15000);
      cdp.onMessage((message) => {
        if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    await cdp.send('Page.navigate', { url: `${BASE_URL}${route.path}` }, sessionId);
    await loaded;
    await sleep(2500); // 等 hydration + ECharts 首帧动画

    const evaluate = async (expression) => {
      const result = await cdp.send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      return result.result?.value;
    };

    const canvasCount = await evaluate('document.querySelectorAll("canvas").length');
    const tableCount = await evaluate('document.querySelectorAll(".ant-table-tbody").length');
    const theme = await evaluate('document.documentElement.dataset.theme');
    const chartInstance = await evaluate(
      'typeof window.echarts === "undefined" ? "echarts-global-absent(ok)" : "echarts-global-present"',
    );
    const bodyStyled = await evaluate(
      'getComputedStyle(document.querySelector(".ant-btn") ?? document.body).borderRadius',
    );

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const slug = route.path === '/' ? 'home' : route.path.replace(/^\//, '').replace(/\//g, '-');
    const fileName = `screenshots/${slug}${THEME === 'dark' ? '-dark' : ''}.png`;
    await writeFile(fileName, Buffer.from(shot.data, 'base64'));

    const canvasOk = route.expectCanvas === 0 ? canvasCount === 0 : canvasCount >= route.expectCanvas;
    const tableOk = route.expectTable === 0 ? true : tableCount >= route.expectTable;
    const clean = consoleErrors.length === 0;

    if (!canvasOk || !tableOk || !clean) failures += 1;

    console.log(
      [
        route.path.padEnd(11),
        `canvas=${String(canvasCount).padEnd(3)}${canvasOk ? '✓' : '✗'}`,
        `table=${String(tableCount).padEnd(2)}${tableOk ? '✓' : '✗'}`,
        `theme=${theme ?? '-'}`,
        `btnRadius=${bodyStyled}`,
        `errors=${consoleErrors.length}${clean ? '✓' : '✗'}`,
        `warnings=${consoleWarnings.length}`,
        `shot=${fileName}`,
      ].join('  '),
    );

    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 4).forEach((text) => console.log(`    ERROR: ${text.slice(0, 220)}`));
    }
    if (consoleWarnings.length > 0) {
      consoleWarnings.slice(0, 3).forEach((text) => console.log(`    WARN : ${text.slice(0, 220)}`));
    }
    console.log(`    probe: ${chartInstance}`);

    await cdp.send('Target.closeTarget', { targetId });
  }

  cdp.close();
  console.log(failures === 0 ? '\nALL ROUTES OK' : `\n${failures} ROUTE(S) WITH PROBLEMS`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('smoke script failed:', error);
  process.exitCode = 1;
});
