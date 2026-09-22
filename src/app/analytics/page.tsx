import type { Metadata } from 'next';
import { Card, Col, Flex, Row, Statistic, Tag } from 'antd';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { RegionTargetChart } from '@/components/charts/RegionTargetChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExcelExportButton } from '@/components/ui/ExcelExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Text } from '@/components/ui/Text';
import { channelShares, channelTotal, metrics, productRanks, salesSeries } from '@/data/mock';
import { formatCurrency, formatNumber } from '@/lib/format';
import { defineSheet } from '@/lib/xlsx';
import type { ChannelShare, Metric, ProductRank, SeriesPoint } from '@/types';

export const metadata: Metadata = {
  title: '数据分析',
};

const REGIONS = [
  { name: '华东大区', amount: 4862000, target: 5200000 },
  { name: '华南大区', amount: 3428000, target: 3600000 },
  { name: '华北大区', amount: 2746000, target: 3100000 },
  { name: '西南大区', amount: 1204000, target: 1600000 },
  { name: '海外事业部', amount: 620430, target: 900000 },
];

const FUNNEL = [
  { step: '线索进入', value: 12860, ratio: 100 },
  { step: '商机确认', value: 6420, ratio: 49.9 },
  { step: '方案报价', value: 3180, ratio: 24.7 },
  { step: '合同签署', value: 1428, ratio: 11.1 },
  { step: '回款完成', value: 1186, ratio: 9.2 },
];

const SUMMARY = [
  { label: '平均客单价', value: formatCurrency(38420), hint: '较上季度 +6.2%' },
  { label: '线索总量', value: formatNumber(12860), hint: '有效线索 82.4%' },
  { label: '整体转化率', value: '9.2%', hint: '行业均值 7.4%' },
  { label: '销售人均产出', value: formatCurrency(1286500), hint: '15 名销售' },
];

/* -------------------------------------------------------------------------- */
/* Excel 导出结构：把一个分析报告拆成多张工作表，比例类字段统一按比例（0.128）写入 */
/* -------------------------------------------------------------------------- */

interface MetricRow extends Metric {
  deltaRatio: number;
}

interface ShareRow extends ChannelShare {
  share: number;
}

interface RegionRow {
  name: string;
  amount: number;
  target: number;
  /** 完成率（比例） */
  rate: number;
  /** 目标差额 */
  gap: number;
}

interface FunnelRow {
  step: string;
  value: number;
  /** 转化率（比例） */
  rate: number;
}

const REPORT_SHEETS = [
  defineSheet<MetricRow>({
    name: '概览指标',
    title: '本月核心指标',
    note: '环比按比例存储（0.128 即 12.80%）· 数据快照 2024-05-17 18:00',
    columns: [
      { title: '指标', key: 'label', width: 16 },
      { title: '数值', key: 'value', type: 'number' },
      { title: '单位', key: 'unit', width: 8 },
      { title: '环比', key: 'deltaRatio', type: 'percent', precision: 2 },
      { title: '对比口径', key: 'compare', width: 16 },
    ],
    rows: metrics.map((metric) => ({ ...metric, deltaRatio: metric.delta / 100 })),
  }),
  defineSheet<SeriesPoint>({
    name: '成交趋势',
    title: '成交趋势（全渠道 · 近 14 天）',
    note: '单位：元',
    columns: [
      { title: '日期', key: 'label', width: 14 },
      { title: '本期成交额', key: 'value', type: 'currency' },
      { title: '上一周期', key: 'previous', type: 'currency' },
    ],
    rows: salesSeries,
    total: true,
  }),
  defineSheet<ShareRow>({
    name: '渠道结构',
    note: `全渠道成交合计 ${formatCurrency(channelTotal)}`,
    columns: [
      { title: '渠道', key: 'name', width: 14 },
      { title: '成交额', key: 'value', type: 'currency' },
      { title: '占比', key: 'share', type: 'percent', precision: 2 },
    ],
    rows: channelShares.map((item) => ({
      ...item,
      share: channelTotal === 0 ? 0 : item.value / channelTotal,
    })),
    total: true,
  }),
  defineSheet<RegionRow>({
    name: '区域达成',
    title: '区域目标达成',
    note: '完成率 = 成交额 / 目标 · 差额为负表示缺口',
    columns: [
      { title: '区域', key: 'name', width: 14 },
      { title: '成交额', key: 'amount', type: 'currency' },
      { title: '目标', key: 'target', type: 'currency' },
      { title: '完成率', key: 'rate', type: 'percent' },
      { title: '差额', key: 'gap', type: 'currency' },
    ],
    rows: REGIONS.map((region) => ({
      ...region,
      rate: region.target === 0 ? 0 : region.amount / region.target,
      gap: region.amount - region.target,
    })),
    total: true,
    totalLabel: '合计',
  }),
  defineSheet<FunnelRow>({
    name: '转化漏斗',
    title: '销售转化漏斗',
    note: '转化率以「线索进入」为基准（比例存储）',
    columns: [
      { title: '环节', key: 'step', width: 16 },
      { title: '数量', key: 'value', type: 'number' },
      { title: '转化率', key: 'rate', type: 'percent' },
    ],
    rows: FUNNEL.map((item) => ({ step: item.step, value: item.value, rate: item.ratio / 100 })),
  }),
  defineSheet<(typeof SUMMARY)[number]>({
    name: '经营小结',
    columns: [
      { title: '指标', key: 'label', width: 18 },
      { title: '结论', key: 'value', width: 16 },
      { title: '补充说明', key: 'hint', width: 24 },
    ],
    rows: SUMMARY,
  }),
  defineSheet<ProductRank>({
    name: '热销商品',
    note: '按成交额降序 · 「相对指数」以榜首为 100',
    columns: [
      { title: '商品', key: 'name', width: 22 },
      { title: '品类', key: 'category', width: 12 },
      { title: '成交额', key: 'amount', type: 'currency' },
      { title: '相对指数', key: 'ratio', type: 'number' },
    ],
    rows: productRanks,
    total: true,
  }),
];

export default function AnalyticsPage() {
  return (
    <>
      <PageHead
        title="数据分析"
        description="从渠道、区域与转化漏斗三个视角拆解本月经营结果。"
        actions={
          <ExcelExportButton
            label="下载分析报告"
            type="primary"
            fileName="数据分析报告"
            sheets={REPORT_SHEETS}
            successMessage="分析报告已导出（7 个工作表）"
          />
        }
      />

      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col key={metric.key} xs={24} sm={12} xl={6}>
            <StatCard metric={metric} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TrendChart data={salesSeries} title="成交趋势（全渠道）" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <ChannelDonut
            data={channelShares}
            title="渠道结构"
            subtitle="成交额与占比"
            centerLabel="全渠道成交"
            height={260}
          />
        </Col>
        <Col xs={24} xl={12}>
          <RegionTargetChart regions={REGIONS} height={300} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <FunnelChart steps={FUNNEL} height={300} />
        </Col>
        <Col xs={24} xl={12}>
          <RankBarChart
            items={productRanks.map((product) => ({ name: product.name, value: product.amount }))}
            title="热销商品"
            subtitle="按成交额降序"
            rowHeight={48}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="经营小结" extra={<Tag color="processing">自动生成</Tag>}>
            <Flex gap={32} wrap>
              {SUMMARY.map((item) => (
                <Flex key={item.label} vertical style={{ minWidth: 160 }}>
                  <Text type="secondary">{item.label}</Text>
                  <Statistic value={item.value} valueStyle={{ fontSize: 20 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.hint}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}
