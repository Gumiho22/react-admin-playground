/**
 * ECharts 按需引入（on-demand / tree-shaking）
 * ---------------------------------------------------------------------------
 * 只注册项目里真正用到的图表、组件、特性与渲染器：
 *  - 图表：折线、条形、饼（环）、漏斗
 *  - 组件：直角坐标系、提示框、图例、标题、数据集、数据变换、标线
 *  - 特性：标签布局防重叠、通用过渡动画
 *  - 渲染器：Canvas
 * 这样最终的 client bundle 不会包含 echarts 全量包（全量约 1MB，按需后约 350KB 未压缩）。
 */
import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, LineChart, PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  MarkLineComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

/** echarts 实例类型（避免直接依赖 echarts 全量包的类型入口） */
export type EChartsInstance = ReturnType<typeof echarts.init>;

/** 配置项类型：type-only 引入，编译后会被完全擦除，不影响打包体积 */
export type { EChartsOption } from 'echarts';

export { echarts };
