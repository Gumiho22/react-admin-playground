'use client';

import { useMemo } from 'react';
import { Card, theme, Typography } from 'antd';
import { EChart } from './EChart';
import type { EChartsOption } from '@/lib/echarts';
import { formatCurrency } from '@/lib/format';

interface RankBarChartProps {
  items: { name: string; value: number }[];
  title?: string;
  subtitle?: string;
  unitLabel?: string;
  barWidth?: number;
  rowHeight?: number;
  /** 前三名使用主题色，其余使用信息色 */
  highlightTop?: number;
}

/** 排行：ECharts 横向条形图（单序列 + 背景槽 + 数值标签） */
export function RankBarChart({
  items,
  title = '排行',
  subtitle,
  barWidth = 14,
  rowHeight = 42,
  highlightTop = 3,
}: RankBarChartProps) {
  const { token } = theme.useToken();
  const height = items.length * rowHeight + 24;

  const option = useMemo<EChartsOption>(() => {
    const max = Math.max(...items.map((item) => item.value), 1);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) => formatCurrency(Number(value)),
      },
      grid: { left: 0, right: 76, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'value', show: false, max: max * 1.18 },
      yAxis: {
        type: 'category',
        inverse: true,
        data: items.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: token.colorTextSecondary, width: 128, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          barWidth,
          showBackground: true,
          backgroundStyle: { color: token.colorFillQuaternary, borderRadius: [0, 7, 7, 0] },
          itemStyle: {
            borderRadius: [0, 7, 7, 0],
            color: (params: { dataIndex: number }) =>
              params.dataIndex < highlightTop ? token.colorPrimary : token.colorInfo,
          },
          label: {
            show: true,
            position: 'right',
            color: token.colorTextSecondary,
            formatter: (params: { value: unknown }) => formatCurrency(Number(params.value)),
          },
          data: items.map((item) => item.value),
        },
      ],
    };
  }, [items, token, barWidth, highlightTop]);

  return (
    <Card
      title={title}
      extra={subtitle ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Typography.Text> : null}
    >
      <EChart option={option} height={height} ariaLabel={`${title}条形图`} />
    </Card>
  );
}
