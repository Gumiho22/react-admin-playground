'use client';

import type { ReactNode } from 'react';
import { Card, Flex, Statistic, theme, Tooltip, Typography } from 'antd';
import {
  AccountBookOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined,
  ProfileOutlined,
  RollbackOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Sparkline } from '@/components/charts/Sparkline';
import { withAlpha } from '@/lib/color';
import { formatCompact, formatDelta, formatNumber } from '@/lib/format';
import type { Metric } from '@/types';

const ICONS: Record<Metric['icon'], ReactNode> = {
  revenue: <AccountBookOutlined />,
  orders: <ProfileOutlined />,
  customers: <TeamOutlined />,
  refund: <RollbackOutlined />,
};

function formatValue(metric: Metric): string {
  if (metric.key === 'revenue') {
    return `¥${formatCompact(metric.value)}`;
  }
  if (metric.unit === '%') {
    return `${metric.value.toFixed(2)}%`;
  }
  return formatNumber(metric.value);
}

/** KPI 指标卡：antd Card + Statistic + Tooltip，趋势线为 ECharts 迷你折线 */
export function StatCard({ metric }: { metric: Metric }) {
  const { token } = theme.useToken();

  const rising = metric.delta >= 0;
  /* 退款率下降属于正向信号 */
  const good = metric.key === 'refund' ? !rising : rising;
  const accent = good ? token.colorSuccess : token.colorError;

  return (
    <Card styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
      <Flex vertical gap={4}>
        <Flex align="center" gap={8}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: withAlpha(token.colorPrimary, 0.12),
              color: token.colorPrimary,
            }}
          >
            {ICONS[metric.icon]}
          </span>
          <Typography.Text type="secondary">{metric.label}</Typography.Text>
          <Tooltip title={`${metric.compare}的同比口径，数据每日 06:00 汇总`}>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />
          </Tooltip>
        </Flex>

        <Statistic value={formatValue(metric)} valueStyle={{ fontSize: 24, fontWeight: 650 }} />

        <Flex align="center" gap={6}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: accent,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {rising ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {formatDelta(Math.abs(metric.delta))}
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {metric.compare}
          </Typography.Text>
        </Flex>
      </Flex>

      <div style={{ margin: '8px -16px -16px' }}>
        <Sparkline values={metric.spark} color={accent} />
      </div>
    </Card>
  );
}
