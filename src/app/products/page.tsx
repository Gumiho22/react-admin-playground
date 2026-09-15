import type { Metadata } from 'next';
import { Button, Card, Col, Row, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { ProductsTable, type InventoryRow } from '@/components/products/ProductsTable';
import { ExportButton } from '@/components/ui/ExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Paragraph, Text } from '@/components/ui/Text';
import { productRanks } from '@/data/mock';

export const metadata: Metadata = {
  title: '商品管理',
};

const INVENTORY: InventoryRow[] = [
  { name: '智能网关 G200', sku: 'HW-GW-200', stock: 328, safe: 200, category: '硬件设备' },
  { name: '边缘计算一体机', sku: 'HW-EC-100', stock: 86, safe: 120, category: '硬件设备' },
  { name: '企业版协作套件', sku: 'SW-SUITE-ENT', stock: null, safe: 0, category: 'SaaS 订阅' },
  { name: '数据中台标准版', sku: 'SW-DP-STD', stock: null, safe: 0, category: 'SaaS 订阅' },
  { name: '安全审计增值包', sku: 'SV-SEC-AUDIT', stock: 512, safe: 150, category: '增值服务' },
  { name: '智能网关 G100', sku: 'HW-GW-100', stock: 64, safe: 100, category: '硬件设备' },
];

export default function ProductsPage() {
  return (
    <>
      <PageHead
        title="商品管理"
        description="商品档案与库存水位示意数据，表格排序、分页与操作列均由 antd Table 提供。"
        actions={
          <>
            <ExportButton label="导出商品" content="商品清单已导出（演示）" />
            <Button type="primary" icon={<PlusOutlined />}>
              新建商品
            </Button>
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="商品档案"
            extra={<Tag color="blue">{INVENTORY.length} 个 SKU</Tag>}
            styles={{ body: { padding: 0 } }}
          >
            <ProductsTable rows={INVENTORY} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <RankBarChart
            items={productRanks.map((product) => ({ name: product.name, value: product.amount }))}
            title="销量贡献"
            subtitle="本月成交额"
            rowHeight={52}
          />
          <Card title="库存健康度" style={{ marginTop: 16 }}>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              6 个 SKU 中 2 个低于安全库存，建议本周内补货。
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              库存数据来自 WMS 同步，最近同步时间 2024-05-17 17:40。
            </Text>
          </Card>
        </Col>
      </Row>
    </>
  );
}
