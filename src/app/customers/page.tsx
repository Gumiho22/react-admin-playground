import type { Metadata } from 'next';
import { Button, Card, Col, Flex, Row, Statistic, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CustomersTable, type CustomerRow } from '@/components/customers/CustomersTable';
import { ExportButton } from '@/components/ui/ExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Text } from '@/components/ui/Text';
import { orders } from '@/data/mock';
import { formatCurrency } from '@/lib/format';

export const metadata: Metadata = {
  title: '客户管理',
};

const LEVELS = [
  { key: 'vip', label: '战略客户', color: 'green', min: 900000 },
  { key: 'regular', label: '重点客户', color: 'blue', min: 400000 },
  { key: 'new', label: '普通客户', color: 'default', min: 0 },
] as const;

function levelOf(amount: number) {
  return LEVELS.find((item) => amount >= item.min) ?? LEVELS[LEVELS.length - 1];
}

/** 按订单聚合客户台账（纯数据计算，放在服务端完成） */
function aggregateCustomers(): CustomerRow[] {
  const map = new Map<string, Omit<CustomerRow, 'levelLabel' | 'levelColor'>>();

  for (const order of orders) {
    const current = map.get(order.company);
    if (current) {
      current.orderCount += 1;
      current.amount += order.amount;
      if (order.createdAt > current.lastOrderAt) {
        current.lastOrderAt = order.createdAt;
      }
    } else {
      map.set(order.company, {
        company: order.company,
        contact: order.customer,
        orderCount: 1,
        amount: order.amount,
        lastOrderAt: order.createdAt,
        owner: order.owner,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((row) => {
      const level = levelOf(row.amount);
      return { ...row, levelLabel: level.label, levelColor: level.color };
    });
}

export default function CustomersPage() {
  const customers = aggregateCustomers();
  const totalAmount = customers.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <PageHead
        title="客户管理"
        description={`共 ${customers.length} 家成交客户 · 累计成交 ${formatCurrency(totalAmount)}`}
        actions={
          <>
            <ExportButton label="导出客户" content="客户清单已导出（演示）" />
            <Button type="primary" icon={<PlusOutlined />}>
              新增客户
            </Button>
          </>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {LEVELS.map((level) => {
          const rows = customers.filter((item) => item.levelLabel === level.label);
          return (
            <Col key={level.key} xs={24} sm={12} xl={6}>
              <Card styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
                <Tag color={level.color}>{level.label}</Tag>
                <Statistic value={rows.length} suffix="家" valueStyle={{ fontSize: 22, marginTop: 8 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  成交额 {formatCurrency(rows.reduce((sum, item) => sum + item.amount, 0))}
                </Text>
              </Card>
            </Col>
          );
        })}
        <Col xs={24} sm={12} xl={6}>
          <Card styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
            <Tag color="purple">平均客单价</Tag>
            <Statistic
              value={formatCurrency(Math.round(totalAmount / Math.max(customers.length, 1)))}
              valueStyle={{ fontSize: 22, marginTop: 8 }}
            />
            <Flex gap={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                按当前成交客户口径统计
              </Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Card
        title="客户列表"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>默认按累计成交额降序</Text>}
        styles={{ body: { padding: 0 } }}
      >
        <CustomersTable rows={customers} />
      </Card>
    </>
  );
}
