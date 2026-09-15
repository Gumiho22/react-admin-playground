'use client';

import { useMemo, useState } from 'react';
import { App, Button, Card, Flex, Segmented, Space, theme, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { EChart } from './EChart';
import { verticalFade } from '@/lib/color';
import type { EChartsOption } from '@/lib/echarts';
import { formatCompact, formatCurrency } from '@/lib/format';
import type { SeriesPoint } from '@/types';

type RangeKey = '7d' | '14d';

const RANGES: { label: string; value: RangeKey; days: number }[] = [
  { label: '近 7 天', value: '7d', days: 7 },
  { label: '近 14 天', value: '14d', days: 14 },
];

interface TrendChartProps {
  data: SeriesPoint[];
  title?: string;
  height?: number;
}

/** 成交趋势：ECharts 折线 + 面积（双序列，含坐标轴指示器十字准星） */
export function TrendChart({ data, title = '成交趋势', height = 320 }: TrendChartProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [range, setRange] = useState<RangeKey>('14d');

  const visible = useMemo(() => {
    const days = RANGES.find((item) => item.value === range)?.days ?? 14;
    return data.slice(-days);
  }, [data, range]);

  const total = visible.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = visible.reduce((sum, point) => sum + point.previous, 0);
  const growth = previousTotal === 0 ? 0 : ((total - previousTotal) / previousTotal) * 100;

  const option = useMemo<EChartsOption>(
    () => ({
      color: [token.colorPrimary, token.colorTextQuaternary],
      animationDuration: 600,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: token.colorPrimary } },
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: token.colorTextSecondary },
        data: ['本期成交额', '上一周期'],
      },
      grid: { left: 4, right: 8, top: 46, bottom: 2, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: visible.map((point) => point.label),
        axisLine: { lineStyle: { color: token.colorBorderSecondary } },
        axisTick: { show: false },
        axisLabel: { color: token.colorTextTertiary },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: token.colorBorderSecondary } },
        axisLabel: {
          color: token.colorTextTertiary,
          formatter: (value: number) => formatCompact(value),
        },
      },
      series: [
        {
          name: '本期成交额',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2.6 },
          itemStyle: { color: token.colorPrimary, borderColor: token.colorBgContainer, borderWidth: 2 },
          areaStyle: { color: verticalFade(token.colorPrimary, 0.28, 0.02) },
          emphasis: { focus: 'series' },
          data: visible.map((point) => point.value),
        },
        {
          name: '上一周期',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.6, type: 'dashed', color: token.colorTextQuaternary },
          itemStyle: { color: token.colorTextQuaternary },
          emphasis: { focus: 'series' },
          data: visible.map((point) => point.previous),
        },
      ],
    }),
    [visible, token],
  );

  return (
    <Card
      title={
        <Flex vertical gap={2}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            区间成交 {formatCurrency(total)} · 环比{' '}
            <span style={{ color: growth >= 0 ? token.colorSuccess : token.colorError, fontWeight: 600 }}>
              {growth >= 0 ? '+' : ''}
              {growth.toFixed(1)}%
            </span>
          </Typography.Text>
        </Flex>
      }
      extra={
        <Space size={8}>
          <Segmented
            size="small"
            value={range}
            onChange={(value) => setRange(value as RangeKey)}
            options={RANGES.map(({ label, value }) => ({ label, value }))}
          />
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => message.success('图表数据已导出（演示）')}
          >
            导出
          </Button>
        </Space>
      }
      styles={{ body: { paddingTop: 8 } }}
    >
      <EChart option={option} height={height} ariaLabel={`${title}折线图`} />
    </Card>
  );
}
