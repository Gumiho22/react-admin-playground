/** 全局业务类型定义 */

/** 订单状态 */
export type OrderStatus = 'paid' | 'pending' | 'shipped' | 'refunded' | 'closed';

/** 客户等级 */
export type CustomerLevel = 'vip' | 'regular' | 'new';

/** 订单实体 */
export interface Order {
  id: string;
  customer: string;
  company: string;
  channel: OrderChannel;
  amount: number;
  items: number;
  status: OrderStatus;
  createdAt: string;
  owner: string;
}

/** 销售渠道 */
export type OrderChannel = '官网直销' | '渠道代理' | '电商平台' | '线下门店';

/** 概览指标卡 */
export interface Metric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  /** 环比百分比，正数为增长 */
  delta: number;
  compare: string;
  icon: 'revenue' | 'orders' | 'customers' | 'refund';
  /** 迷你趋势图数据 */
  spark: number[];
}

/** 图表数据点 */
export interface SeriesPoint {
  label: string;
  value: number;
  previous: number;
}

/** 渠道占比 */
export interface ChannelShare {
  name: string;
  value: number;
  color: string;
}

/** 动态消息 */
export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

/** 待办任务 */
export interface TaskItem {
  id: string;
  title: string;
  owner: string;
  progress: number;
  due: string;
}

/** 商品销售排行 */
export interface ProductRank {
  id: string;
  name: string;
  category: string;
  amount: number;
  ratio: number;
}

/** 分页结果 */
export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
