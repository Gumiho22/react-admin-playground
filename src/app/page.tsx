import Link from 'next/link';
import { Avatar, Button, Card, Col, Flex, Row, Tag, Timeline } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { TodoList } from '@/components/dashboard/TodoList';
import { ExcelExportButton } from '@/components/ui/ExcelExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Text, Title } from '@/components/ui/Text';
import { activities, channelShares, channelTotal, metrics, productRanks, salesSeries, tasks } from '@/data/mock';
import { formatCurrency, initials } from '@/lib/format';
import { defineSheet } from '@/lib/xlsx';
import type { ActivityItem, ChannelShare, Metric, ProductRank, SeriesPoint, TaskItem } from '@/types';

const TONE_COLOR: Record<ActivityItem['tone'], string> = {
  success: 'green',
  info: 'blue',
  warning: 'orange',
  danger: 'red',
};

/* -------------------------------------------------------------------------- */
/* Excel 导出结构：环比 / 占比统一换算成比例（0.128 = 12.80%），Excel 端可继续计算 */
/* -------------------------------------------------------------------------- */

interface MetricRow extends Metric {
  deltaRatio: number;
}

interface ShareRow extends ChannelShare {
  share: number;
}

interface TaskRow extends TaskItem {
  progressRatio: number;
}

const EXPORT_SHEETS = [
  defineSheet<MetricRow>({
    name: '概览指标',
    title: '核心指标',
    note: '数据口径：2024-05-17 18:00 快照 · 环比按比例存储（0.128 即 12.80%）',
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
    title: '成交趋势（近 14 天）',
    note: '单位：元 · 数据来源 salesSeries',
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
  defineSheet<ProductRank>({
    name: '商品排行',
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
  defineSheet<TaskRow>({
    name: '待办任务',
    columns: [
      { title: '任务', key: 'title', width: 24 },
      { title: '负责人', key: 'owner', width: 12 },
      { title: '进度', key: 'progressRatio', type: 'percent' },
      { title: '截止时间', key: 'due', width: 16 },
    ],
    rows: tasks.map((task) => ({ ...task, progressRatio: task.progress / 100 })),
  }),
];

export default function DashboardPage() {
  return (
    <>
      <PageHead
        title="工作台"
        description="数据更新至 2024-05-17 18:00 · 每 5 分钟自动刷新"
        actions={
          <>
            <ExcelExportButton
              label="导出报表"
              fileName="经营概览"
              sheets={EXPORT_SHEETS}
              successMessage="经营概览已导出（5 个工作表）"
            />
            <Link href="/orders">
              <Button type="primary" icon={<PlusOutlined />}>
                新建订单
              </Button>
            </Link>
          </>
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
        <Col xs={24} xl={15}>
          <TrendChart data={salesSeries} />
        </Col>
        <Col xs={24} xl={9}>
          <Flex vertical gap={16}>
            <ChannelDonut data={channelShares} subtitle="本月成交额占比" />

            <Card title="我的待办" extra={<Tag color="processing">4 项进行中</Tag>} styles={{ body: { paddingTop: 8 } }}>
              <TodoList tasks={tasks} />
            </Card>
          </Flex>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <RankBarChart
            items={productRanks.map((product) => ({ name: product.name, value: product.amount }))}
            title="商品销售排行"
            subtitle="按成交额降序 · Top 5"
            rowHeight={44}
          />
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title="团队动态"
            extra={<Tag color="warning">最近 24 小时</Tag>}
            styles={{ body: { paddingBottom: 8 } }}
          >
            <Timeline
              items={activities.map((item) => ({
                key: item.id,
                color: TONE_COLOR[item.tone],
                children: (
                  <Flex align="flex-start" gap={10}>
                    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13 }}>
                        <Text strong>{item.actor}</Text> {item.action} <Text strong>{item.target}</Text>
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.time}
                      </Text>
                    </Flex>
                    <Avatar size="small" style={{ backgroundColor: 'rgba(79,70,229,0.12)', color: '#4f46e5' }}>
                      {initials(item.actor)}
                    </Avatar>
                  </Flex>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="待回款提醒"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                账期超过 30 天的订单
              </Text>
            }
          >
            <Flex gap={32} wrap align="center">
              <Flex vertical>
                <Text type="secondary">待回款订单</Text>
                <Title level={4} style={{ margin: 0 }}>
                  12 笔
                </Title>
              </Flex>
              <Flex vertical>
                <Text type="secondary">待回款金额</Text>
                <Title level={4} style={{ margin: 0 }}>
                  {formatCurrency(2864000)}
                </Title>
              </Flex>
              <Flex vertical>
                <Text type="secondary">最长账期</Text>
                <Title level={4} style={{ margin: 0 }}>
                  47 天
                </Title>
              </Flex>
              <Link href="/orders" style={{ marginLeft: 'auto' }}>
                <Button type="link">查看全部订单</Button>
              </Link>
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}
