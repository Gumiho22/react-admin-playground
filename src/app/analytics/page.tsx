import type { Metadata } from 'next';
import { Card, Col, Flex, Row, Statistic, Tag } from 'antd';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { RegionTargetChart } from '@/components/charts/RegionTargetChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExportButton } from '@/components/ui/ExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Text } from '@/components/ui/Text';
import { channelShares, metrics, productRanks, salesSeries } from '@/data/mock';
import { formatCurrency, formatNumber } from '@/lib/format';

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

export default function AnalyticsPage() {
  return (
    <>
      <PageHead
        title="数据分析"
        description="从渠道、区域与转化漏斗三个视角拆解本月经营结果。"
        actions={<ExportButton label="下载分析报告" content="分析报告已加入下载队列（演示）" type="primary" />}
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
