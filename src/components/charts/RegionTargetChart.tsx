'use client';

import { useMemo } from 'react';
import { Card, theme, Typography } from 'antd';
import { EChart } from './EChart';
import { withAlpha } from '@/lib/color';
import type { EChartsOption } from '@/lib/echarts';
import { formatCompact, formatCurrency } from '@/lib/format';

interface RegionTargetChartProps {
  regions: { name: string; amount: number; target: number }[];
  title?: string;
  height?: number;
}

/** 区域目标达成：ECharts 分组横向条形图（实际 vs 目标） */
export function RegionTargetChart({ regions, title = '区域目标达成', height = 260 }: RegionTargetChartProps) {
  const { token } = theme.useToken();

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) => formatCurrency(Number(value)),
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: token.colorTextSecondary },
        data: ['实际成交额', '月度目标'],
      },
      grid: { left: 0, right: 16, top: 40, bottom: 0, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: token.colorTextTertiary, formatter: (value: number) => formatCompact(value) },
        splitLine: { lineStyle: { type: 'dashed', color: token.colorBorderSecondary } },
      },
      yAxis: {
        type: 'category',
        data: regions.map((region) => region.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: token.colorTextSecondary },
      },
      series: [
        {
          name: '实际成交额',
          type: 'bar',
          barWidth: 12,
          itemStyle: { color: token.colorPrimary, borderRadius: [0, 6, 6, 0] },
          data: regions.map((region) => region.amount),
        },
        {
          name: '月度目标',
          type: 'bar',
          barWidth: 12,
          itemStyle: { color: withAlpha(token.colorInfo, 0.35), borderRadius: [0, 6, 6, 0] },
          data: regions.map((region) => region.target),
        },
      ],
    }),
    [regions, token],
  );

  return (
    <Card
      title={title}
      extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>本月累计 / 月度目标</Typography.Text>}
    >
      <EChart option={option} height={height} ariaLabel={`${title}分组条形图`} />
    </Card>
  );
}
