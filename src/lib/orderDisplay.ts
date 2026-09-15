import { statusMeta } from '@/data/mock';
import type { OrderStatus } from '@/types';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

/** 业务语义色 → antd Tag 预设色 */
export const TONE_TO_TAG: Record<Tone, string> = {
  success: 'green',
  warning: 'orange',
  info: 'blue',
  danger: 'red',
  neutral: 'default',
};

/** 订单状态 → antd Tag 颜色（复用 mock 数据里的语义色定义，避免多处硬编码） */
export function statusTagColor(status: OrderStatus): string {
  return TONE_TO_TAG[statusMeta[status].tone];
}

/** 订单状态 → antd Badge/Tag 上的圆点色 */
export const TONE_TO_DOT: Record<Tone, string> = {
  success: '#16a34a',
  warning: '#d97706',
  info: '#4f46e5',
  danger: '#dc2626',
  neutral: '#8895a7',
};
