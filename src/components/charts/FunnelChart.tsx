'use client';

import { useMemo } from 'react';
import { Card, theme, Typography } from 'antd';
import { EChart } from './EChart';
import { withAlpha } from '@/lib/color';
import type { EChartsOption } from '@/lib/echarts';
import { formatNumber } from '@/lib/format';

interface FunnelChartProps {
  steps: { step: string; value: number; ratio: number }[];
  title?: string;
  height?: number;
}

/** 销售转化漏斗：ECharts funnel 序列（按数值降序，标签内置） */
export function FunnelChart({ steps, title = '销售转化漏斗', height = 300 }: FunnelChartProps) {
  const { token } = theme.useToken();

  const option = useMemo<EChartsOption>(() => {
    const palette = [
      token.colorPrimary,
      withAlpha(token.colorInfo, 0.85),
      withAlpha(token.colorWarning, 0.85),
      withAlpha(token.colorSuccess, 0.85),
      withAlpha(token.colorTextTertiary, 0.85),
    ];
    return {
      tooltip: {
        trigger: 'item',
        /* 用 unknown 收参再收窄：tooltip 的 formatter 参数在 ECharts 里可能是单个或数组 */
        formatter: (params: unknown) => {
          const item = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: unknown };
          return `${item?.name ?? ''}<br/>数量：${formatNumber(Number(item?.value ?? 0))}`;
        },
      },
      series: [
        {
          type: 'funnel',
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          minSize: '24%',
          maxSize: '100%',
          sort: 'descending',
          gap: 4,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            formatter: (params: { name: string; value: unknown }) =>
              `${params.name}  ${formatNumber(Number(params.value))}`,
          },
          itemStyle: { borderColor: token.colorBgContainer, borderWidth: 2 },
          data: steps.map((item, index) => ({
            name: item.step,
            value: item.value,
            itemStyle: { color: palette[index % palette.length] },
          })),
        },
      ],
    };
  }, [steps, token]);

  return (
    <Card
      title={title}
      extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>本月线索 → 回款</Typography.Text>}
    >
      <EChart option={option} height={height} ariaLabel={`${title}漏斗图`} />
    </Card>
  );
}
