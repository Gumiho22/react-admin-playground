import type { Member, Permission, Role } from '@/types';

/**
 * 权限数据（全部为 mock，模拟真实 RBAC）
 *
 * - 权限码统一 `资源:动作`，例如 `order:export`；
 * - 角色 = 权限集合，超级管理员用通配符 `*`；
 * - 成员 = 角色 + 个人额外授予 − 个人禁用（演示同角色例外）；
 * - 所有改动都只发生在内存里（前端状态），刷新页面回到初始值。
 */

interface PermissionDraft {
  code: string;
  name: string;
  description: string;
}

export interface PermissionGroupDraft {
  key: string;
  label: string;
  items: PermissionDraft[];
}

/** 权限清单：按业务分组的权威定义 */
export const PERMISSION_GROUPS: PermissionGroupDraft[] = [
  {
    key: 'page',
    label: '页面访问',
    items: [
      { code: 'page:dashboard', name: '工作台', description: '访问经营概览工作台' },
      { code: 'page:analytics', name: '数据分析', description: '访问数据分析、区域达成与转化漏斗' },
      { code: 'page:orders', name: '订单管理', description: '访问订单列表、筛选与勾选' },
      { code: 'page:customers', name: '客户管理', description: '访问客户台账与等级统计' },
      { code: 'page:products', name: '商品管理', description: '访问商品档案与库存健康度' },
      { code: 'page:settings', name: '系统设置', description: '访问系统配置表单' },
      { code: 'page:permission', name: '权限管理', description: '访问权限后台（成员 / 角色 / 权限清单）' },
    ],
  },
  {
    key: 'order',
    label: '订单操作',
    items: [
      { code: 'order:view', name: '查看订单', description: '查看订单明细与合计金额' },
      { code: 'order:create', name: '新建订单', description: '创建新的销售订单' },
      { code: 'order:update', name: '编辑订单', description: '修改订单信息与负责人' },
      { code: 'order:import', name: '批量导入', description: '通过模板批量导入订单' },
      { code: 'order:export', name: '导出订单', description: '导出筛选结果或勾选订单为 Excel' },
      { code: 'order:refund', name: '退款处理', description: '审批并处理退款工单' },
    ],
  },
  {
    key: 'customer',
    label: '客户操作',
    items: [
      { code: 'customer:view', name: '查看客户', description: '查看客户台账与成交额' },
      { code: 'customer:create', name: '新增客户', description: '录入新的客户档案' },
      { code: 'customer:export', name: '导出客户', description: '导出客户清单为 Excel' },
    ],
  },
  {
    key: 'product',
    label: '商品操作',
    items: [
      { code: 'product:view', name: '查看商品', description: '查看商品档案与库存水位' },
      { code: 'product:create', name: '新建商品', description: '创建新的商品 SKU' },
      { code: 'product:stock', name: '库存调整', description: '调整库存与安全水位' },
      { code: 'product:export', name: '导出商品', description: '导出商品清单为 Excel' },
    ],
  },
  {
    key: 'data',
    label: '数据权限',
    items: [
      { code: 'data:export', name: '导出报表', description: '导出经营报表与分析报告' },
      { code: 'data:amount', name: '查看成交金额', description: '可见订单金额与成交额等敏感字段' },
      { code: 'data:scope:dept', name: '本部门数据', description: '数据范围限定在所在部门' },
      { code: 'data:scope:all', name: '全部数据', description: '数据范围覆盖全部业务线' },
    ],
  },
  {
    key: 'system',
    label: '系统管理',
    items: [
      { code: 'system:setting', name: '系统配置', description: '修改基础信息与通知策略' },
      { code: 'system:member', name: '成员管理', description: '新增 / 停用成员并分配角色' },
      { code: 'system:role', name: '角色管理', description: '编辑角色与角色权限矩阵' },
      { code: 'system:audit', name: '审计日志', description: '查看登录与操作审计日志' },
    ],
  },
];

/** 拍平后的权限清单（带 group 字段） */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

/** 权限码 → 权限项 */
export const PERMISSION_MAP: Record<string, Permission> = Object.fromEntries(
  ALL_PERMISSIONS.map((permission) => [permission.code, permission]),
);

/** 通配符：拥有它等于拥有全部权限 */
export const WILDCARD_PERMISSION = '*';

/** 角色定义 */
export const ROLES: Role[] = [
  {
    id: 'super',
    name: '超级管理员',
    description: '拥有全部权限（通配符 *），内置角色不可调整',
    color: 'red',
    permissions: [WILDCARD_PERMISSION],
    builtin: true,
  },
  {
    id: 'admin',
    name: '系统管理员',
    description: '可管理成员、角色与系统配置，除退款审批外覆盖全部业务操作',
    color: 'purple',
    permissions: [
      'page:dashboard',
      'page:analytics',
      'page:orders',
      'page:customers',
      'page:products',
      'page:settings',
      'page:permission',
      'order:view',
      'order:create',
      'order:update',
      'order:import',
      'order:export',
      'customer:view',
      'customer:create',
      'customer:export',
      'product:view',
      'product:create',
      'product:stock',
      'product:export',
      'data:export',
      'data:amount',
      'data:scope:all',
      'system:setting',
      'system:member',
      'system:role',
      'system:audit',
    ],
    builtin: true,
  },
  {
    id: 'ops',
    name: '运营专员',
    description: '负责订单与商品的日常运营，数据范围限本部门',
    color: 'blue',
    permissions: [
      'page:dashboard',
      'page:analytics',
      'page:orders',
      'page:customers',
      'page:products',
      'order:view',
      'order:create',
      'order:update',
      'order:export',
      'customer:view',
      'customer:export',
      'product:view',
      'product:export',
      'data:export',
      'data:amount',
      'data:scope:dept',
    ],
  },
  {
    id: 'sales',
    name: '销售顾问',
    description: '只能看自己的订单与客户，可新建订单 / 客户并导出',
    color: 'geekblue',
    permissions: [
      'page:dashboard',
      'page:orders',
      'page:customers',
      'order:view',
      'order:create',
      'order:export',
      'customer:view',
      'customer:create',
      'customer:export',
      'data:export',
      'data:amount',
      'data:scope:dept',
    ],
  },
  {
    id: 'finance',
    name: '财务专员',
    description: '负责对账与退款审批，不参与订单录入',
    color: 'cyan',
    permissions: [
      'page:dashboard',
      'page:analytics',
      'page:orders',
      'order:view',
      'order:export',
      'order:refund',
      'data:export',
      'data:amount',
      'data:scope:all',
    ],
  },
  {
    id: 'guest',
    name: '访客',
    description: '只读演示账号，仅可访问工作台，无任何导出权限',
    color: 'default',
    permissions: ['page:dashboard'],
  },
];

/** 成员账号（对应平台里的 7 位成员） */
export const MEMBERS: Member[] = [
  {
    id: 'u-001',
    name: '王思远',
    account: 'wangsiyuan',
    email: 'wangsiyuan@yunshu.com',
    department: '平台架构组',
    title: '技术负责人',
    roleId: 'super',
    status: 'active',
    lastLoginAt: '2024-05-17T18:02:00+08:00',
  },
  {
    id: 'u-002',
    name: '李梦琪',
    account: 'limengqi',
    email: 'limengqi@yunshu.com',
    department: '运营中心',
    title: '运营总监',
    roleId: 'admin',
    status: 'active',
    lastLoginAt: '2024-05-17T17:41:00+08:00',
  },
  {
    id: 'u-003',
    name: '陈嘉怡',
    account: 'chenjiayi',
    email: 'chenjiayi@yunshu.com',
    department: '运营中心',
    title: '运营专员',
    roleId: 'ops',
    status: 'active',
    lastLoginAt: '2024-05-17T16:20:00+08:00',
    /* 同角色例外：临时授予权限管理入口，同时禁用成交金额字段 */
    extraPermissions: ['page:permission'],
    deniedPermissions: ['data:amount'],
  },
  {
    id: 'u-004',
    name: '赵子豪',
    account: 'zhaozihao',
    email: 'zhaozihao@yunshu.com',
    department: '销售一部',
    title: '销售经理',
    roleId: 'sales',
    status: 'active',
    lastLoginAt: '2024-05-17T15:08:00+08:00',
  },
  {
    id: 'u-005',
    name: '欧阳靖',
    account: 'ouyangjing',
    email: 'ouyangjing@yunshu.com',
    department: '销售二部',
    title: '销售顾问',
    roleId: 'sales',
    status: 'active',
    lastLoginAt: '2024-05-16T19:32:00+08:00',
    extraPermissions: ['page:products'],
  },
  {
    id: 'u-006',
    name: '周明',
    account: 'zhouming',
    email: 'zhouming@yunshu.com',
    department: '财务部',
    title: '财务主管',
    roleId: 'finance',
    status: 'active',
    lastLoginAt: '2024-05-17T09:15:00+08:00',
  },
  {
    id: 'u-007',
    name: '孙雅',
    account: 'sunya',
    email: 'sunya@partner.com',
    department: '外部协作',
    title: '渠道伙伴（访客）',
    roleId: 'guest',
    status: 'disabled',
    lastLoginAt: '2024-05-10T11:26:00+08:00',
  },
  {
    id: 'u-008',
    name: '何以宁',
    account: 'heyining',
    email: 'heyining@partner.com',
    department: '外部协作',
    title: '渠道伙伴（访客）',
    roleId: 'guest',
    status: 'active',
    lastLoginAt: '2024-05-17T10:04:00+08:00',
  },
];

/** 默认登录账号（演示用超管，保证首屏功能完整） */
export const DEFAULT_MEMBER_ID = 'u-001';
