import type { Metadata } from 'next';
import { Button, Card, Col, Row, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { ProductsTable, type InventoryRow } from '@/components/products/ProductsTable';
import { ExcelExportButton } from '@/components/ui/ExcelExportButton';
import { PageHead } from '@/components/ui/PageHead';
import { Paragraph, Text } from '@/components/ui/Text';
import { productRanks } from '@/data/mock';
import { defineSheet } from '@/lib/xlsx';
import type { ProductRank } from '@/types';

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

/** 导出用的商品行：把库存状态（UI 里的 Tag 文案）落成文本列 */
interface ProductExportRow extends InventoryRow {
  status: string;
  /** 虚拟商品没有库存，导出留空并在说明行标注 */
  stockValue: number | null;
}

function stockStatus(row: InventoryRow): string {
  if (row.stock === null) return '虚拟商品';
  return row.stock < row.safe ? '低于安全库存' : '库存充足';
}

const EXPORT_ROWS: ProductExportRow[] = INVENTORY.map((row) => ({
  ...row,
  status: stockStatus(row),
  stockValue: row.stock,
}));

const EXPORT_SHEETS = [
  defineSheet<ProductExportRow>({
    name: '商品档案',
    title: '商品档案与库存',
    note: '库存留空表示虚拟商品（SaaS 订阅 / 增值服务）不限库存 · 数据同步时间 2024-05-17 17:40',
    columns: [
      { title: '商品名称', key: 'name', width: 22 },
      { title: 'SKU', key: 'sku', width: 18 },
      { title: '品类', key: 'category', width: 12 },
      { title: '库存', key: 'stockValue', type: 'number', width: 10 },
      { title: '安全库存', key: 'safe', type: 'number', width: 12 },
      { title: '库存状态', key: 'status', width: 16 },
    ],
    rows: EXPORT_ROWS,
  }),
  defineSheet<ProductRank>({
    name: '销量贡献',
    title: '商品销售排行（本月成交额）',
    note: '「相对指数」以榜首为 100',
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

export default function ProductsPage() {
  return (
    <>
      <PageHead
        title="商品管理"
        description="商品档案与库存水位示意数据，表格排序、分页与操作列均由 antd Table 提供。"
        actions={
          <>
            <ExcelExportButton
              label="导出商品"
              fileName="商品清单"
              sheets={EXPORT_SHEETS}
              successMessage="商品清单已导出（商品档案 + 销量贡献）"
            />
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
