/** 格式化工具：统一使用固定时区，保证服务端 / 客户端输出一致 */

const TIME_ZONE = 'Asia/Shanghai';

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('zh-CN');

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** ¥12,345 */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** 1,234 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 1286.5万 / 1.29亿 / 8,642 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) {
    return `${(value / 1e8).toFixed(2)}亿`;
  }
  if (abs >= 1e4) {
    return `${(value / 1e4).toFixed(1)}万`;
  }
  return numberFormatter.format(value);
}

/** +12.8% / -0.36% */
export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace(/\.?0+$/, '')}%`;
}

/** 2024/05/17 */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** 05/17 14:20 */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso)).replace(/\//g, '/');
}

/** 姓名首字，用于头像占位 */
export function initials(name: string): string {
  return name.trim().charAt(0) || '?';
}
