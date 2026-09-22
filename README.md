# 云枢运营平台 · B 端后台管理页面

基于 **Next.js 14（App Router）+ React 18 + TypeScript 5 + antd 5 + ECharts 5** 的企业级后台管理后台演示。
所有图表由 **ECharts 按需引入**实现，界面组件尽量替换为 **antd**。

## 技术栈与版本

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| `next` | 14.2.35 | App Router、RSC、静态预渲染 |
| `react` / `react-dom` | 18.3.1 | UI 运行时 |
| `typescript` | 5.9.3 | `strict` + `noUnusedLocals` |
| `antd` | 5.29.3 | 全部界面组件（Layout / Table / Form 控件 / 反馈） |
| `@ant-design/icons` | 5.6.1 | 图标（ESM，按需 tree-shaking） |
| `@ant-design/nextjs-registry` | 1.3.0 | App Router 下的 cssinjs 样式抽取（消除首屏 FOUC） |
| `@ant-design/cssinjs` | ^1.24.0 | **显式锁定**，与 antd 5 去重（详见「踩坑记录」） |
| `echarts` | 5.6.0 | 全部图表（`echarts/core` + `echarts.use()` 按需注册） |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

| 脚本 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建（构建结果 9 个路由全部静态预渲染） |
| `npm start` | 启动生产服务 |
| `npm run typecheck` | `tsc --noEmit` |
| `node scripts/ui-smoke.mjs` | 无头浏览器冒烟验证 + 截图（见下文） |
| `node scripts/verify-xlsx.cjs` | 导出内核自检：生成一份覆盖全部单元格类型的 .xlsx |
| `node scripts/verify-export-ui.mjs` | 导出链路端到端验证：真实浏览器点击导出并校验落盘文件 |

## 按需引入方案

### ECharts：显式注册，不使用整包

`src/lib/echarts.ts` 是唯一的注册入口，只注册项目实际用到的能力：

```ts
import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DatasetComponent,
         TransformComponent, MarkLineComponent } from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([/* 上述全部 */]);
```

- 类型用 `export type { EChartsOption } from 'echarts'`（**type-only**，编译后完全擦除，不影响体积）。
- `next.config.mjs` 里对 `echarts` 额外开启 `experimental.optimizePackageImports` 作为兜底，
  防止有人从 `'echarts'` 根入口整包引入。
- 通用容器 `src/components/charts/EChart.tsx`：只在浏览器端 `init`、`ResizeObserver` 自适应
  （侧栏折叠 / 窗口缩放 / 主题切换都会重绘）、`setOption(option, { notMerge })` 由配置对象驱动。

### antd：v5 ESM 天然 tree-shaking

antd v5 的 `es/` 产物每个组件一个文件且自带 `"use client"`，配合 Next 的打包即可按需引入，
**不需要** `babel-plugin-import`。

> ⚠️ 但不要对 antd 打开 `experimental.optimizePackageImports`：在 Server Component 中使用
> `Typography.Title`、`List.Item` 这类**复合组件成员**会命中 Next 的已知缺陷
> `Could not find the module ...__barrel_optimize__...#Typography#Title in the React Client Manifest`。
> 本项目把这类访问收敛到 `src/components/ui/Text.tsx`（`'use client'` 包装）里规避。

## antd 替换清单

| 原先自研 | 现在使用 |
| --- | --- |
| 侧栏 / 顶栏 / 内容区骨架 | `Layout` + `Sider` + `Menu`（分组菜单、徽标）+ `Header` + `Content`，移动端换 `Drawer` |
| 面包屑、用户菜单、通知 | `Breadcrumb`、`Dropdown`、`Badge` + `Tooltip` |
| 卡片、标题区 | `Card`（`title` / `extra` / `styles.body`）、`Flex`、`Row` + `Col` 栅格 |
| KPI 数值 | `Statistic`（`valueStyle`）+ `Tooltip` |
| 状态标签、圆点 | `Tag`（语义色映射见 `src/lib/orderDisplay.ts`）、`Badge` |
| 按钮、图标按钮 | `Button`（`type="primary" / "link" / "text"`、`icon`）+ `@ant-design/icons` |
| 搜索框、下拉筛选 | `Input`（`allowClear`、`prefix`）、`Select` |
| 数据表格（原手写排序 + 分页） | `Table`：`sorter` / `defaultSortOrder` / `pagination` / `rowSelection` / `scroll.x` / `Table.Summary` / `Empty` |
| 进度条、进度环 | `Progress`（`type="line"` / `type="circle"`） |
| 时间线、列表 | `Timeline`（`items`）、`List` + `List.Item` |
| 开关、下拉设置项 | `Switch`、`Select` |
| 操作反馈 | `App.useApp()` 的 `message`（导出、保存、复制等） |
| 下载 / 导出 Excel | 自研零依赖导出内核 + `ExcelExportButton` / `useExcelExport`（见「Excel 导出」） |
| 404 页 | `Result status="404"` |
| 主题切换 | `ConfigProvider` + `theme.darkAlgorithm` / `defaultAlgorithm` + `Switch` |

## ECharts 图表清单

| 图表 | 组件 | ECharts 能力 |
| --- | --- | --- |
| 成交趋势（双序列折线 + 面积 + 十字准星提示） | `TrendChart` | `line` + `areaStyle` 线性渐变 + `axisPointer: cross` |
| 渠道构成环图（中心文案） | `ChannelDonut` | `pie` + `radius: ['58%','80%']` + `title` 居中 |
| 商品 / 区域排行 | `RankBarChart` | `bar` 横向 + 背景槽 + 数值标签 |
| 区域目标达成（实际 vs 目标） | `RegionTargetChart` | `bar` 分组双序列 + `legend` |
| 销售转化漏斗 | `FunnelChart` | `funnel`（`sort: descending`、内置标签） |
| KPI 迷你趋势线 | `Sparkline` | `line` + `silent: true`、无坐标轴 |
| 渠道明细比例条 | antd `Progress` | —— 表格/列表内的比例条用组件更合适 |

**主题联动**：所有图表都不写死颜色，而是通过 `theme.useToken()` 读取 antd 设计令牌
（`colorPrimary` / `colorTextSecondary` / `colorBorderSecondary` / `colorBgContainer` …）生成
option；切换深浅色时 `option` 变化触发 `setOption` 自动重绘，Canvas 与 antd 组件配色始终一致。

## Excel 导出

项目里所有「下载 / 导出」入口统一收敛到一套自研的零依赖导出内核（`src/lib/xlsx/`）：
点击即在浏览器本地生成真正的 `.xlsx`（OOXML）并落盘，**不经服务端，也没有引入
SheetJS / ExcelJS / file-saver**。

### 为什么自己写

一份 `.xlsx` 本质就是「若干 XML + ZIP 容器」。本场景只需要写入能力，用 ZIP 的 `store`（不压缩）
方式即可被 Excel / WPS / Numbers / Google Sheets 正常打开：

- `src/lib/xlsx/zip.ts`：CRC32 + ZIP 头（local / central / EOCD），约 150 行；
- `src/lib/xlsx/index.ts`：OOXML 组装（workbook、worksheet、styles、关系与内容类型），
  全程 `Uint8Array` + `TextEncoder`，浏览器与 Node 都能跑；
- 客户端体积开销约 10 KB，且不存在第三方库的版本 / 停更风险。

### 用法

声明式（推荐，页面里直接放一个按钮）：

```tsx
<ExcelExportButton
  label="导出客户"
  fileName="客户清单"
  sheets={[
    defineSheet<CustomerRow>({
      name: '客户列表',
      title: '客户台账',
      note: '贡献占比 = 客户成交额 / 总成交额',
      columns: [
        { title: '客户', key: 'company', width: 22 },
        { title: '累计成交额', key: 'amount', type: 'currency' },
        { title: '贡献占比', key: 'share', type: 'percent', precision: 2 },
        { title: '最近下单', key: 'lastOrderAt', type: 'date' },
      ],
      rows: customers,
      total: true,
    }),
  ]}
/>
```

命令式（没有按钮的场合，例如快捷键、右键菜单、图形工具栏）：

```tsx
const { exportExcel, exporting } = useExcelExport();
await exportExcel(() => [{ name: '订单明细', columns, rows: currentRows }]);
```

`sheets` 支持传函数，会在**点击时**才求值 —— 因此「导出当前筛选结果 / 当前勾选行」
天然拿到最新状态（见 `OrdersTable.tsx`、`TrendChart.tsx`）。

### 单元格类型

| `type` | 写入方式 | Excel 数字格式 |
| --- | --- | --- |
| `text`（默认） | 内联字符串 | 常规（左对齐、自动换行） |
| `number` | 数值 | `#,##0` |
| `currency` | 数值 | `"¥"#,##0` |
| `percent` | 数值（**传比例：`0.123` = 12.3%**） | `0.0%` |
| `date` / `datetime` | Excel 日期序列号 | `yyyy/m/d` / `yyyy/m/d hh:mm` |
| `boolean` | 布尔 | 常规 |

- `precision` 只影响**显示格式**，不会截断真实值（Excel 求和仍按原始精度）；
- `date/datetime` 按 `Asia/Shanghai` 挂钟时间换算成序列号，与页面展示一致，
  同时在 Excel 里仍是可排序、可筛选的真日期；
- 表头自动冻结 + 自动筛选；列宽按内容估算（中文按 2 字符宽），可用 `width` 覆盖；
- `total: true` 追加合计行（自动汇总 `number` / `currency` 列）；
- 工作表名自动清洗（31 字符上限、去掉 `[]:*?/\`）并去重；`title` / `note` 行自动合并单元格；
- 内含 `docProps/core.xml` + `docProps/app.xml` 文档属性（真实 Office 文件都有，缺失时部分阅读器会提示「文件已损坏」）。

### 文件名

统一为 **`<名称>-<导出日期>.xlsx`**（如 `成交趋势（全渠道）-近14天-20260922.xlsx`），名称来源优先级：

1. 按钮 / hook 显式传入的 `fileName`；
2. 工作簿的 `fileName`；
3. **首个工作表的 `title`，即用户看到的图表名 / 表格标题**（`TrendChart` 直接用图表自身的 `title`，因此工作台是「成交趋势」、数据分析页是「成交趋势（全渠道）」）；
4. 工作表 `name`；
5. 兜底 `导出数据`。

清洗规则会去掉路径分隔符与 Windows 非法字符、压缩空白与重复连字符、截断到 80 字符，并保证
**永远不会产出「只有扩展名」的名字**（`.xlsx` 这类文件名会被 Windows / Excel 判定非法而打不开）。

### 已接入的入口

| 页面 | 按钮 | 导出内容 |
| --- | --- | --- |
| 工作台 | 导出报表 | 概览指标 / 成交趋势 / 渠道结构 / 商品排行 / 待办任务（5 张表） |
| 工作台 · 成交趋势图 | 导出 | 当前区间的双序列 + 环比；文件名 = 图表名 + 区间 |
| 数据分析 | 下载分析报告 | 7 张表（含区域达成、转化漏斗、经营小结） |
| 订单管理 | 导出筛选结果 / 导出所选 | 当前筛选条件或勾选行的明细 + 合计，筛选条件写进说明行 |
| 客户管理 | 导出客户 | 客户台账 + 贡献占比 |
| 商品管理 | 导出商品 | 商品档案 + 销量贡献 |

> 所有按钮默认走**浏览器下载**（文件名完全由 `a[download]` 决定，兼容性最好）。
> `saveAs`（File System Access API 的系统「另存为」对话框）是可选能力，默认关闭：
> 那条路径的文件名最终由系统对话框决定，若对话框里名字被清空就会落盘成 `.xlsx`
> 这种「只有扩展名」的文件，Windows / Excel / WPS 都会判定非法而拒绝打开。
> 内核会校验句柄返回的真实文件名，发现异常自动回退为普通下载。

> ⚠️ Server Component 传给客户端组件的 `sheets` 必须是可序列化的普通对象，
> 因此跨 RSC 边界时只能用 `key` 取数；需要函数式取值（`value`）时把导出放进客户端组件
> （见 `OrdersTable.tsx` / `TrendChart.tsx`）。

### 验证

```powershell
# 1) 内核自检：生成覆盖全部单元格类型 + 各种边界的 .xlsx，并交叉校验 ZIP/CRC
node scripts/verify-xlsx.cjs
Expand-Archive .tmp/export-check.xlsx .tmp/export-check-unzip -Force   # Windows 自带解压验证容器

# 2) 端到端：真实浏览器点击每个导出按钮，确认 .xlsx 落盘且无控制台报错
#    （前置：应用已启动 + 无头浏览器已开 CDP，见「UI 冒烟验证」）
node scripts/verify-export-ui.mjs
```

最近一次端到端结果（Chrome 153 headless，`next build` + `next start` 生产产物，`download=completed` 表示浏览器确认下载完整落盘）：

```
✓  /           工作台经营概览   经营概览-20260922.xlsx                        24.0KB   sheets=5  download=completed
✓  /analytics  数据分析报告     数据分析报告-20260922.xlsx                     29.9KB   sheets=7  download=completed
✓  /           趋势图导出      成交趋势-近14天-20260922.xlsx                   12.1KB   sheets=1  download=completed
✓  /analytics  趋势图导出      成交趋势（全渠道）-近14天-20260922.xlsx          12.2KB   sheets=1  download=completed
✓  /orders     订单筛选结果     订单列表-筛选结果-20260922.xlsx                 51.3KB   sheets=1  download=completed
✓  /orders     订单勾选导出     订单列表-已选-20260922.xlsx                     15.1KB   sheets=1  download=completed
✓  /customers  客户清单        客户清单-20260922.xlsx                          16.2KB   sheets=1  download=completed
✓  /products   商品清单        商品清单-20260922.xlsx                          15.3KB   sheets=2  download=completed
```

产物另外用 **两个互相独立的第三方读取器（exceljs 4.4 + SheetJS 0.18）** 交叉解析校验工作表数量与内容，
并用 Windows 自带 `Expand-Archive` + .NET XML 解析器校验 ZIP 容器与每个 XML 部件，
确保文件能被真实电子表格软件打开。

## 目录结构

```
src/
├─ app/
│  ├─ layout.tsx            # AntdRegistry + ThemeProvider + AppShell，含主题引导脚本
│  ├─ globals.css           # 仅保留页面底色/滚动条等 antd 不覆盖的样式
│  ├─ icon.svg              # favicon
│  ├─ page.tsx              # 工作台（Server）     ├─ analytics/page.tsx  数据分析
│  ├─ orders/page.tsx       # 订单管理（Server）    ├─ customers/page.tsx  客户管理
│  ├─ products/page.tsx     # 商品管理（Server）    ├─ settings/page.tsx   系统设置
│  └─ not-found.tsx         # antd Result 404
├─ components/
│  ├─ providers/ThemeProvider.tsx  # ConfigProvider(zhCN) + 深浅色算法 + antd App
│  ├─ layout/AppShell.tsx          # Layout/Sider/Menu/Header/Drawer/Dropdown
│  ├─ charts/                      # EChart 容器 + 6 个 ECharts 图表组件
│  ├─ dashboard/                   # StatCard、TodoList
│  ├─ orders/ customers/ products/ # antd Table 客户端组件
│  ├─ settings/SettingsPanels.tsx
│  └─ ui/                          # PageHead、Text（Typography 客户端包装）、ExcelExportButton
├─ data/mock.ts             # 确定性伪随机 Mock（保证 SSR/CSR 一致）
├─ lib/                     # echarts 注册、color、format、nav、orderDisplay、xlsx（导出内核）
└─ types/index.ts
```

**Server / Client 边界**：页面默认是 Server Component（可导出 `metadata`）；只有需要状态、
事件或函数型 props（`Table` 的 `sorter`/`render`、`List` 的 `renderItem`）的部分才拆成
`'use client'` 组件。

## 踩坑记录（都是运行时验证抓出来的）

1. **antd 样式没进 SSR，首屏 FOUC**
   `@ant-design/nextjs-registry` 的 peer 是 `>=1.0.0`，npm 自动装了
   `@ant-design/cssinjs@2.1.2` 到根目录，而 antd 5 依赖 `^1.23.0`（被嵌套安装）。
   两个不同的库实例导致 registry 的 cache 与 antd 组件不共享，`extractStyle` 抽不到任何样式。
   **修复**：把 `@ant-design/cssinjs@^1.24.0` 提升为直接依赖，去重为单实例。
   验证：生产 HTML 从 99KB → 568KB，出现 `<style id="antd-cssinjs">`（`.ant-btn` 规则 1500+ 条）。
2. **`optimizePackageImports` + 复合组件在 RSC 下崩溃**
   见上文「antd 按需引入」小节，用 `src/components/ui/Text.tsx` 收敛复合成员访问。
3. **hydration 一致性**
   Mock 数据用固定种子伪随机；金额/日期统一 `Intl` + 固定 `Asia/Shanghai` 时区；
   断点判断用 `screens.lg === false`（而不是 `!screens.lg`），保证首帧与 SSR 一致。

## UI 冒烟验证

`scripts/ui-smoke.mjs` 通过 CDP 驱动无头 Edge/Chrome，逐路由断言并截图：

```powershell
# 1) 启动应用（dev 或 build+start）
npm run dev
# 2) 另开终端启动无头浏览器
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --headless=new --disable-gpu --remote-debugging-port=9222 `
  --user-data-dir="$PWD\.edge-profile" about:blank
# 3) 跑验证（THEME=dark 可验证深色主题）
$env:BASE_URL="http://localhost:3000"; node scripts/ui-smoke.mjs
```

最近一次结果（dev 与生产均通过）：

```
/            canvas=7  ✓  table=0 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
/analytics   canvas=9  ✓  table=0 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
/orders      canvas=0  ✓  table=1 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
/customers   canvas=0  ✓  table=1 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
/products    canvas=1  ✓  table=1 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
/settings    canvas=0  ✓  table=0 ✓  theme=light  btnRadius=8px  errors=0✓  warnings=0
```

截图输出在 `screenshots/`（浅色 + `-dark` 深色各一套）。

## 包体积（生产构建，First Load JS）

| 路由 | 页面代码 | First Load JS |
| --- | --- | --- |
| `/` 工作台 | 3.02 kB | 532 kB |
| `/analytics` | 1.49 kB | 475 kB |
| `/orders` | 6.54 kB | 373 kB |
| `/customers` | 2.37 kB | 359 kB |
| `/products` | 2.78 kB | 563 kB |
| `/settings` | 1.87 kB | 287 kB |

引入 antd + ECharts 后体积明显上升（此前零依赖版本首页 ~100 kB），这是这套技术选型的必然代价。
可选的后续优化：
1. 图表改为 `next/dynamic` + `ssr: false` 延迟到交互后再加载，首屏只留骨架；
2. 开启 antd 的 CSS 变量模式（`theme={{ cssVar: true }}`）减少运行时样式计算；
3. 仅保留实际用到的 ECharts 图表类型（当前已按需注册，若某页不用可再拆分 registry）。

## 后续扩展建议

1. 接入真实接口：把 `src/data/mock.ts` 换成 Server Component 内的 `fetch` 或 Route Handler BFF。
2. 表格远程分页：`Table` 的 `pagination` 改为受控（`useSearchParams` + 服务端分页），
   `sorter` 映射为查询参数。
3. 表单：新增订单/客户改用 antd `Form` + `Drawer`/`Modal`，校验用 `Form.Item` 规则或 `zod`。
4. 权限：`src/lib/nav.ts` 增加 `roles` 字段，配合 `middleware.ts` 做路由级鉴权与菜单过滤。
