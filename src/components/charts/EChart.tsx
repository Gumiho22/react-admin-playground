'use client';

import { useEffect, useRef } from 'react';
import { echarts, type EChartsInstance, type EChartsOption } from '@/lib/echarts';

interface EChartProps {
  option: EChartsOption;
  height?: number | string;
  ariaLabel?: string;
  className?: string;
  /** true = 完全替换配置（切换维度时用），false = 合并配置（保留过渡动画） */
  notMerge?: boolean;
  style?: React.CSSProperties;
}

/**
 * ECharts 通用容器：
 * - 只在浏览器端 init，SSR 阶段输出等高占位 div，避免首屏抖动
 * - ResizeObserver 跟随容器尺寸自适应（含侧栏折叠、窗口缩放）
 * - 主题切换由上层传入的 option（基于 antd design token 生成）驱动，自动重绘
 */
export function EChart({ option, height = 300, ariaLabel, className, notMerge = false, style }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<EChartsInstance | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const instance = echarts.init(element, undefined, { renderer: 'canvas' });
    instanceRef.current = instance;

    const observer = new ResizeObserver(() => {
      instance.resize();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge });
  }, [option, notMerge]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height, ...style }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
