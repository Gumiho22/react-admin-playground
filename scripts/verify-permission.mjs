/**
 * 权限控制端到端验证（无头浏览器 + CDP）
 * ---------------------------------------------------------------------------
 * 对每个「账号 × 路由」组合，断言：
 *   1) 左侧菜单是否按权限过滤（没权限的入口不该出现，/permissions 临时放开）
 *   2) 没权限的页面是否渲染 403（且不渲染页面正文）
 *   3) 没权限的操作按钮是否被禁用
 *   4) 权限管理页可打开，且无编辑权限时矩阵只读
 *
 * 用法（前置：应用已启动 + 无头浏览器已开 CDP，见 README）：
 *   node scripts/verify-permission.mjs
 * 环境变量：CDP_PORT（9222）、BASE_URL（http://localhost:3000）
 */
const CDP_PORT = process.env.CDP_PORT ?? '9222';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

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

/** 账号 → 期望结果 */
const CASES = [
  {
    memberId: 'u-001',
    name: '王思远（超级管理员）',
    path: '/',
    expectMenu: ['工作台', '数据分析', '订单管理', '客户管理', '商品管理', '权限管理', '系统设置'],
    forbidden: false,
    exportDisabled: false,
  },
  {
    memberId: 'u-008',
    name: '何以宁（访客）',
    path: '/',
    expectMenu: ['工作台', '权限管理'],
    forbidden: false,
    exportDisabled: true,
  },
  {
    memberId: 'u-008',
    name: '何以宁（访客）',
    path: '/products',
    expectMenu: ['工作台', '权限管理'],
    forbidden: true,
  },
  {
    memberId: 'u-008',
    name: '何以宁（访客）',
    path: '/orders',
    expectMenu: ['工作台', '权限管理'],
    forbidden: true,
  },
  {
    /* 已停用账号（孙雅）即使本地存了它的 id，也应回落到默认账号，即「停用后无法登录」 */
    memberId: 'u-007',
    name: '孙雅（已停用，应回落超管）',
    path: '/',
    expectMenu: ['工作台', '数据分析', '订单管理', '客户管理', '商品管理', '权限管理', '系统设置'],
    forbidden: false,
    exportDisabled: false,
  },
  {
    memberId: 'u-005',
    name: '欧阳靖（销售顾问 + 额外商品页）',
    path: '/products',
    expectMenu: ['工作台', '订单管理', '客户管理', '商品管理', '权限管理'],
    forbidden: false,
  },
  {
    memberId: 'u-003',
    name: '陈嘉怡（运营专员，禁用成交金额）',
    path: '/settings',
    expectMenu: ['工作台', '数据分析', '订单管理', '客户管理', '商品管理', '权限管理'],
    forbidden: true,
  },
  {
    memberId: 'u-003',
    name: '陈嘉怡（运营专员）',
    path: '/permissions',
    expectMenu: ['工作台', '数据分析', '订单管理', '客户管理', '商品管理', '权限管理'],
    forbidden: false,
    readonlyMatrix: true,
  },
  {
    memberId: 'u-002',
    name: '李梦琪（系统管理员）',
    path: '/permissions',
    expectMenu: ['工作台', '数据分析', '订单管理', '客户管理', '商品管理', '权限管理', '系统设置'],
    forbidden: false,
    readonlyMatrix: false,
  },
];

async function main() {
  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();
  console.log(`浏览器: ${version.Browser}\n`);

  let failures = 0;

  for (const testCase of CASES) {
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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);
    /* 在页面脚本执行前写入「当前账号」，模拟已登录的不同角色 */
    await cdp.send(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: `try{localStorage.setItem('b-admin:user','${testCase.memberId}')}catch(e){}` },
      sessionId,
    );

    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, 20000);
      cdp.onMessage((message) => {
        if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    await cdp.send('Page.navigate', { url: `${BASE_URL}${testCase.path}` }, sessionId);
    await loaded;
    await sleep(2500);

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? '页面脚本异常');
      return result.result?.value;
    };

    const menuLabels = await evaluate(
      `[...document.querySelectorAll('.ant-menu-item')]
        .map((el) => el.textContent.trim().replace(/\\d+$/, ''))
        .filter((text) => text.length > 0 && text.length < 12)`,
    );
    const forbidden = await evaluate(`document.body.innerText.includes('暂无访问权限')`);
    const exportDisabled = await evaluate(`(() => {
      const btn = [...document.querySelectorAll('.ant-btn')].find((item) => item.textContent.includes('导出报表'));
      if (!btn) return null;
      return btn.disabled || btn.className.includes('ant-btn-disabled');
    })()`);

    let readonlyMatrix = null;
    if (testCase.readonlyMatrix !== undefined) {
      await evaluate(`(() => {
        const tab = [...document.querySelectorAll('.ant-tabs-tab')].find((item) => item.textContent.includes('角色权限矩阵'));
        tab?.click();
        return true;
      })()`);
      await sleep(800);
      readonlyMatrix = await evaluate(`(() => {
        const boxes = [...document.querySelectorAll('.ant-checkbox-input')];
        if (boxes.length === 0) return null;
        return boxes.every((box) => box.disabled);
      })()`);
    }

    const problems = [];
    if (forbidden !== testCase.forbidden) {
      problems.push(`403 状态不符（期望 ${testCase.forbidden}，实际 ${forbidden}）`);
    }
    if (testCase.expectMenu) {
      const missing = testCase.expectMenu.filter((label) => !menuLabels.includes(label));
      const extra = menuLabels.filter((label) => !testCase.expectMenu.includes(label));
      if (missing.length) problems.push(`菜单缺少 ${missing.join('/')}`);
      if (extra.length) problems.push(`菜单多出 ${extra.join('/')}`);
    }
    if (testCase.exportDisabled !== undefined && exportDisabled !== null && exportDisabled !== testCase.exportDisabled) {
      problems.push(`导出按钮禁用状态不符（期望 ${testCase.exportDisabled}，实际 ${exportDisabled}）`);
    }
    if (testCase.readonlyMatrix !== undefined && readonlyMatrix !== null && readonlyMatrix !== testCase.readonlyMatrix) {
      problems.push(`矩阵只读状态不符（期望 ${testCase.readonlyMatrix}，实际 ${readonlyMatrix}）`);
    }
    if (errors.length > 0) problems.push(`控制台报错 ${errors.length} 条：${errors[0]?.slice(0, 120)}`);

    if (problems.length > 0) failures += 1;

    console.log(
      [
        (problems.length ? '✗' : '✓').padEnd(2),
        testCase.name.padEnd(30),
        testCase.path.padEnd(13),
        `菜单[${menuLabels.join(',')}]`.padEnd(52),
        `403=${forbidden}`,
        testCase.exportDisabled === undefined ? '' : `导出禁用=${exportDisabled}`,
        testCase.readonlyMatrix === undefined ? '' : `矩阵只读=${readonlyMatrix}`,
      ].join(' '),
    );
    problems.forEach((text) => console.log(`     → ${text}`));

    await cdp.send('Target.closeTarget', { targetId });
  }

  cdp.close();
  console.log(failures === 0 ? '\n全部权限场景符合预期' : `\n${failures} 个场景不符合预期`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('权限验证脚本失败:', error);
  process.exitCode = 1;
});
