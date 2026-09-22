'use client';

import { useMemo, useState } from 'react';
import { Card, Flex, Segmented, Space, theme, Typography } from 'antd';
import { EChart } from './EChart';
import { ExcelExportButton } from '@/components/ui/ExcelExportButton';
import { verticalFade } from '@/lib/color';
import type { EChartsOption } from '@/lib/echarts';
import { formatCompact, formatCurrency } from '@/lib/format';
import { defineSheet } from '@/lib/xlsx';
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

/** 导出用的趋势行：附上环比（比例，用于 Excel 百分比列） */
interface TrendExportRow extends SeriesPoint {
  growth: number | null;
}

/** 成交趋势：ECharts 折线 + 面积（双序列，含坐标轴指示器十字准星） */
export function TrendChart({ data, title = '成交趋势', height = 320 }: TrendChartProps) {
  const { token } = theme.useToken();
  const [range, setRange] = useState<RangeKey>('14d');

  const visible = useMemo(() => {
    const days = RANGES.find((item) => item.value === range)?.days ?? 14;
    return data.slice(-days);
  }, [data, range]);

  const total = visible.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = visible.reduce((sum, point) => sum + point.previous, 0);
  const growth = previousTotal === 0 ? 0 : ((total - previousTotal) / previousTotal) * 100;
  const rangeLabel = RANGES.find((item) => item.value === range)?.label ?? '';

  /** 导出当前选中区间的图表数据（含环比，可在 Excel 里继续做透视） */
  const buildExportSheet = () =>
    defineSheet<TrendExportRow>({
      name: title,
      title: `${title} · ${rangeLabel}`,
      note:
        `区间成交 ${formatCurrency(total)} · 环比 ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% · ` +
        '环比 =（本期成交额 - 上一周期）/ 上一周期',
      columns: [
        { title: '日期', key: 'label', width: 14 },
        { title: '本期成交额', key: 'value', type: 'currency' },
        { title: '上一周期', key: 'previous', type: 'currency' },
        { title: '环比', key: 'growth', type: 'percent' },
      ],
      rows: visible.map((point) => ({
        ...point,
        growth: point.previous === 0 ? null : (point.value - point.previous) / point.previous,
      })),
      total: true,
      totalLabel: '区间合计',
    });

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
          <ExcelExportButton
            size="small"
            label="导出"
            /* 文件名动态取当前图表名 + 当前区间，例如「成交趋势（全渠道）-近14天-20240517.xlsx」 */
            fileName={`${title}-${rangeLabel.replace(/\s+/g, '')}`}
            sheets={() => [buildExportSheet()]}
          />
        </Space>
      }
      styles={{ body: { paddingTop: 8 } }}
    >
      <EChart option={option} height={height} ariaLabel={`${title}折线图`} />
    </Card>
  );
}
