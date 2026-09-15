/** 颜色工具：把 antd 设计令牌里的十六进制色转成带透明度的 rgba，用于 ECharts 渐变 */

export function withAlpha(color: string, alpha: number): string {
  const value = color.trim();

  const full = /^#([0-9a-f]{6})$/i.exec(value);
  if (full?.[1]) {
    const hex = full[1];
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short?.[1]) {
    const [r, g, b] = short[1].split('').map((char) => Number.parseInt(char + char, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* 其他形态（rgb()/hsl()/变量）原样返回，避免出现非法颜色 */
  return value;
}

/** ECharts 线性渐变对象（纵向，从上到下） */
export function verticalFade(color: string, from = 0.3, to = 0.02) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, from) },
      { offset: 1, color: withAlpha(color, to) },
    ],
  };
}
