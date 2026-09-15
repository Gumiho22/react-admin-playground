import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, Col, Row, Statistic, Tag } from 'antd';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { PageHead } from '@/components/ui/PageHead';
import { Text } from '@/components/ui/Text';
import { orders, statusMeta } from '@/data/mock';
import { formatCurrency } from '@/lib/format';
import { statusTagColor } from '@/lib/orderDisplay';
import type { OrderStatus } from '@/types';

export const metadata: Metadata = {
  title: '订单管理',
};

export default function OrdersPage() {
  const summary: { status: OrderStatus; count: number; amount: number }[] = (
    Object.keys(statusMeta) as OrderStatus[]
  ).map((status) => {
    const rows = orders.filter((order) => order.status === status);
    return {
      status,
      count: rows.length,
      amount: rows.reduce((sum, order) => sum + order.amount, 0),
    };
  });

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <>
      <PageHead
        title="订单管理"
        description="支持关键字检索、状态与渠道筛选，表头可点击排序，分页与合计由 antd Table 统一处理。"
        actions={
          <>
            <Button icon={<ImportOutlined />}>批量导入</Button>
            <Link href="/orders">
              <Button type="primary" icon={<PlusOutlined />}>
                新建订单
              </Button>
            </Link>
          </>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {summary.map((item) => (
          <Col key={item.status} xs={12} sm={8} xl={4}>
            <Card styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
              <Tag color={statusTagColor(item.status)}>{statusMeta[item.status].label}</Tag>
              <Statistic value={item.count} suffix="单" valueStyle={{ fontSize: 22, marginTop: 8 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                合计 {formatCurrency(item.amount)}
              </Text>
            </Card>
          </Col>
        ))}
        <Col xs={12} sm={8} xl={4}>
          <Card styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
            <Tag color="purple">全部订单</Tag>
            <Statistic value={orders.length} suffix="单" valueStyle={{ fontSize: 22, marginTop: 8 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              合计 {formatCurrency(totalAmount)}
            </Text>
          </Card>
        </Col>
      </Row>

      <OrdersTable rows={orders} />
    </>
  );
}
