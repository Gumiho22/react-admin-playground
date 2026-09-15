import type {
  ActivityItem,
  ChannelShare,
  Metric,
  Order,
  OrderChannel,
  OrderStatus,
  ProductRank,
  SeriesPoint,
  TaskItem,
} from '@/types';

/* -------------------------------------------------------------------------- */
/* 确定性伪随机：保证服务端与客户端渲染结果一致，避免 hydration 不匹配        */
/* -------------------------------------------------------------------------- */

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = createRandom(20240517);

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T;
}

/* -------------------------------------------------------------------------- */
/* 概览指标                                                                    */
/* -------------------------------------------------------------------------- */

export const metrics: Metric[] = [
  {
    key: 'revenue',
    label: '本月成交额',
    value: 12865430,
    unit: '元',
    delta: 12.8,
    compare: '较上月同期',
    icon: 'revenue',
    spark: [42, 46, 44, 52, 58, 55, 63, 68, 66, 74, 79, 86],
  },
  {
    key: 'orders',
    label: '新增订单',
    value: 3862,
    unit: '单',
    delta: 8.4,
    compare: '较上月同期',
    icon: 'orders',
    spark: [30, 34, 31, 38, 36, 42, 45, 43, 49, 52, 50, 57],
  },
  {
    key: 'customers',
    label: '活跃客户',
    value: 1428,
    unit: '家',
    delta: 3.1,
    compare: '较上月同期',
    icon: 'customers',
    spark: [55, 53, 57, 58, 56, 60, 62, 61, 64, 66, 65, 69],
  },
  {
    key: 'refund',
    label: '退款率',
    value: 1.42,
    unit: '%',
    delta: -0.36,
    compare: '较上月同期',
    icon: 'refund',
    spark: [22, 24, 21, 23, 19, 20, 18, 17, 18, 16, 15, 14],
  },
];

/* -------------------------------------------------------------------------- */
/* 销售趋势                                                                    */
/* -------------------------------------------------------------------------- */

const DAY_LABELS = [
  '05-04',
  '05-05',
  '05-06',
  '05-07',
  '05-08',
  '05-09',
  '05-10',
  '05-11',
  '05-12',
  '05-13',
  '05-14',
  '05-15',
  '05-16',
  '05-17',
];

export const salesSeries: SeriesPoint[] = DAY_LABELS.map((label, index) => {
  const base = 320000 + index * 18000;
  const wave = Math.sin(index / 1.8) * 46000;
  const value = Math.round(base + wave + rand() * 32000);
  return {
    label,
    value,
    previous: Math.round(value * (0.78 + rand() * 0.14)),
  };
});

/* -------------------------------------------------------------------------- */
/* 渠道占比                                                                    */
/* -------------------------------------------------------------------------- */

export const channelShares: ChannelShare[] = [
  { name: '渠道代理', value: 4862000, color: '#4f46e5' },
  { name: '官网直销', value: 3428000, color: '#22d3ee' },
  { name: '电商平台', value: 2746000, color: '#f59e0b' },
  { name: '线下门店', value: 1829430, color: '#10b981' },
];

export const channelTotal = channelShares.reduce((sum, item) => sum + item.value, 0);

/* -------------------------------------------------------------------------- */
/* 动态 / 待办 / 商品排行                                                       */
/* -------------------------------------------------------------------------- */

export const activities: ActivityItem[] = [
  {
    id: 'act-1',
    actor: '王思远',
    action: '审批通过了大客户折扣申请',
    target: '恒瑞科技',
    time: '8 分钟前',
    tone: 'success',
  },
  {
    id: 'act-2',
    actor: '李梦琪',
    action: '提交了本周渠道对账单',
    target: '华东大区',
    time: '32 分钟前',
    tone: 'info',
  },
  {
    id: 'act-3',
    actor: '系统',
    action: '检测到库存低于安全水位',
    target: '智能网关 G200',
    time: '1 小时前',
    tone: 'warning',
  },
  {
    id: 'act-4',
    actor: '赵子豪',
    action: '发起了退款工单',
    target: 'SO-20240516-2043',
    time: '2 小时前',
    tone: 'danger',
  },
  {
    id: 'act-5',
    actor: '陈嘉怡',
    action: '完成了季度目标复盘',
    target: '华南大区',
    time: '昨天 18:20',
    tone: 'info',
  },
];

export const tasks: TaskItem[] = [
  { id: 'task-1', title: 'Q2 渠道返点结算', owner: '李梦琪', progress: 82, due: '5 月 20 日截止' },
  { id: 'task-2', title: '新版报价单模板上线', owner: '王思远', progress: 64, due: '5 月 23 日截止' },
  { id: 'task-3', title: '客户回访数据补齐', owner: '陈嘉怡', progress: 41, due: '5 月 28 日截止' },
  { id: 'task-4', title: '库存盘点与调拨', owner: '赵子豪', progress: 27, due: '5 月 31 日截止' },
];

export const productRanks: ProductRank[] = [
  { id: 'p-1', name: '智能网关 G200', category: '硬件设备', amount: 2864000, ratio: 100 },
  { id: 'p-2', name: '企业版协作套件', category: 'SaaS 订阅', amount: 2415000, ratio: 84 },
  { id: 'p-3', name: '数据中台标准版', category: 'SaaS 订阅', amount: 1980000, ratio: 69 },
  { id: 'p-4', name: '边缘计算一体机', category: '硬件设备', amount: 1526000, ratio: 53 },
  { id: 'p-5', name: '安全审计增值包', category: '增值服务', amount: 984000, ratio: 34 },
];

/* -------------------------------------------------------------------------- */
/* 订单数据                                                                    */
/* -------------------------------------------------------------------------- */

const CUSTOMERS = [
  { name: '恒瑞科技', contact: '周明' },
  { name: '蓝湖数据', contact: '孙雅' },
  { name: '星野智造', contact: '吴桐' },
  { name: '云图信息', contact: '郑楠' },
  { name: '北辰医疗', contact: '冯乐' },
  { name: '麦田零售', contact: '许倩' },
  { name: '极光传媒', contact: '何俊' },
  { name: '锦程物流', contact: '马晓' },
  { name: '天工重工', contact: '邓伟' },
  { name: '青柠教育', contact: '谢婉' },
  { name: '海纳半导体', contact: '卢凯' },
  { name: '同舟保险', contact: '袁雪' },
] as const;

const CHANNELS: readonly OrderChannel[] = ['官网直销', '渠道代理', '电商平台', '线下门店'];
const OWNERS = ['王思远', '李梦琪', '陈嘉怡', '赵子豪', '欧阳靖'] as const;
const STATUSES: readonly OrderStatus[] = ['paid', 'pending', 'shipped', 'refunded', 'closed'];

function buildOrders(count: number): Order[] {
  const rows: Order[] = [];
  for (let i = 0; i < count; i += 1) {
    const customer = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
    const channel = pick(CHANNELS);
    // 退款/关闭占比更低，更贴近真实分布
    const roll = rand();
    const status: OrderStatus =
      roll < 0.34 ? 'paid' : roll < 0.62 ? 'shipped' : roll < 0.84 ? 'pending' : roll < 0.94 ? 'refunded' : 'closed';
    const day = 17 - Math.floor(i / 5);
    const hour = 9 + Math.floor(rand() * 11);
    const minute = Math.floor(rand() * 60);
    const seq = 1000 + Math.floor(rand() * 8999);
    rows.push({
      id: `SO-202405${String(Math.max(day, 1)).padStart(2, '0')}-${seq}`,
      customer: customer.contact,
      company: customer.name,
      channel,
      amount: Math.round((2800 + rand() * 186000) / 10) * 10,
      items: 1 + Math.floor(rand() * 9),
      status,
      createdAt: `2024-05-${String(Math.max(day, 1)).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(
        minute,
      ).padStart(2, '0')}:00+08:00`,
      owner: pick(OWNERS),
    });
  }
  return rows;
}

export const orders: Order[] = buildOrders(68);

export const statusMeta: Record<OrderStatus, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }> =
  {
    paid: { label: '已付款', tone: 'success' },
    shipped: { label: '已发货', tone: 'info' },
    pending: { label: '待付款', tone: 'warning' },
    refunded: { label: '退款中', tone: 'danger' },
    closed: { label: '已关闭', tone: 'neutral' },
  };

export const channelMeta: Record<OrderChannel, { color: string }> = {
  官网直销: { color: '#4f46e5' },
  渠道代理: { color: '#22d3ee' },
  电商平台: { color: '#f59e0b' },
  线下门店: { color: '#10b981' },
};

export const orderChannels: readonly OrderChannel[] = CHANNELS;
export const orderStatuses: readonly OrderStatus[] = STATUSES;
