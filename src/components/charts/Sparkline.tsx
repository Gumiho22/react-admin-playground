'use client';

import { useMemo } from 'react';
import { EChart } from './EChart';
import { verticalFade } from '@/lib/color';
import type { EChartsOption } from '@/lib/echarts';

interface SparklineProps {
  values: number[];
  color: string;
  height?: number;
}

/** KPI 卡片的迷你趋势线：无坐标轴、无交互，纯装饰（silent） */
export function Sparkline({ values, color, height = 36 }: SparklineProps) {
  const option = useMemo<EChartsOption>(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min || 1) * 0.2;
    return {
      animation: false,
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      tooltip: { show: false },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false,
        data: values.map((_, index) => index),
      },
      yAxis: { type: 'value', show: false, min: min - padding, max: max + padding },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'none',
          silent: true,
          lineStyle: { width: 1.8, color },
          areaStyle: { color: verticalFade(color, 0.28, 0) },
          data: values,
        },
      ],
    };
  }, [values, color]);

  return <EChart option={option} height={height} ariaLabel="趋势缩略图" />;
}
