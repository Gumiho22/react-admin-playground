'use client';

import { useMemo } from 'react';
import { Card, Flex, Progress, theme, Typography } from 'antd';
import { EChart } from './EChart';
import type { EChartsOption } from '@/lib/echarts';
import { formatCompact, formatCurrency } from '@/lib/format';
import type { ChannelShare } from '@/types';

interface ChannelDonutProps {
  data: ChannelShare[];
  title?: string;
  subtitle?: string;
  centerLabel?: string;
  height?: number;
}

/** 渠道构成：ECharts 环形饼图 + antd Progress 明细列表 */
export function ChannelDonut({
  data,
  title = '渠道构成',
  subtitle,
  centerLabel = '全渠道成交',
  height = 230,
}: ChannelDonutProps) {
  const { token } = theme.useToken();
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      title: {
        text: `¥${formatCompact(total)}`,
        subtext: centerLabel,
        left: 'center',
        top: '36%',
        textAlign: 'center',
        textStyle: { fontSize: 20, fontWeight: 600, color: token.colorText },
        subtextStyle: { fontSize: 12, color: token.colorTextTertiary },
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['58%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: token.colorBgContainer,
            borderWidth: 2,
            borderRadius: 4,
          },
          label: { show: false },
          labelLine: { show: false },
          emphasis: { scale: true, scaleSize: 6 },
          data: data.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color },
          })),
        },
      ],
    }),
    [data, total, centerLabel, token],
  );

  return (
    <Card title={title} extra={subtitle ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Typography.Text> : null}>
      <EChart option={option} height={height} ariaLabel={`${title}环形图`} />
      <Flex vertical gap={10} style={{ marginTop: 12 }}>
        {data.map((item) => (
          <Flex key={item.name} align="center" gap={10}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: item.color, flex: '0 0 8px' }} />
            <Typography.Text style={{ flex: 1, minWidth: 0 }}>{item.name}</Typography.Text>
            <Progress
              percent={Number(((item.value / total) * 100).toFixed(1))}
              showInfo={false}
              strokeColor={item.color}
              size="small"
              style={{ width: 96, marginBottom: 0 }}
            />
            <Typography.Text strong style={{ width: 56, textAlign: 'right' }}>
              {((item.value / total) * 100).toFixed(1)}%
            </Typography.Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
