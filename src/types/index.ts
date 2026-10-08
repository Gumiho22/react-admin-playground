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

/* -------------------------------------------------------------------------- */
/* 权限（RBAC，全部由 mock 数据模拟）                                          */
/* -------------------------------------------------------------------------- */

/** 权限项：权限码统一为 `资源:动作`，`*` 代表全部权限 */
export interface Permission {
  code: string;
  name: string;
  /** 所属分组（页面访问 / 订单 / 客户 / 商品 / 数据 / 系统） */
  group: string;
  description: string;
}

/** 角色：一组权限的集合 */
export interface Role {
  id: string;
  name: string;
  description: string;
  /** antd Tag 语义色 */
  color: string;
  permissions: string[];
  /** 内置角色（不可删除） */
  builtin?: boolean;
}

/** 成员账号状态 */
export type MemberStatus = 'active' | 'disabled';

/**
 * 成员账号：有效权限 = 角色权限 ∪ 个人额外授予 − 个人禁用
 * （个人级配置用来演示「同角色不同权限」的例外场景）
 */
export interface Member {
  id: string;
  name: string;
  account: string;
  email: string;
  department: string;
  title: string;
  roleId: string;
  status: MemberStatus;
  lastLoginAt: string;
  extraPermissions?: string[];
  deniedPermissions?: string[];
}
