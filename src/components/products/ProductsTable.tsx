'use client';

import { App, Button, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export interface InventoryRow {
  name: string;
  sku: string;
  stock: number | null;
  safe: number;
  category: string;
}

/** 商品档案表格：库存水位用 antd Tag 语义色表达，行内操作走 antd Button */
export function ProductsTable({ rows }: { rows: InventoryRow[] }) {
  const { message } = App.useApp();

  const columns: ColumnsType<InventoryRow> = [
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string, row: InventoryRow) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.category}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 170,
      render: (sku: string) => (
        <Typography.Text className="mono" copyable={{ text: sku }}>
          {sku}
        </Typography.Text>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 120,
      align: 'right',
      sorter: (a: InventoryRow, b: InventoryRow) => (a.stock ?? Number.MAX_SAFE_INTEGER) - (b.stock ?? Number.MAX_SAFE_INTEGER),
      render: (stock: number | null) => (stock === null ? '不限' : stock.toLocaleString('zh-CN')),
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: (_: unknown, row: InventoryRow) => {
        if (row.stock === null) {
          return <Tag>虚拟商品</Tag>;
        }
        return row.stock < row.safe ? (
          <Tag color="red">低于安全库存</Tag>
        ) : (
          <Tag color="green">库存充足</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, row: InventoryRow) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => message.info(`打开「${row.name}」的编辑抽屉（演示）`)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => message.success(`已生成「${row.name}」的补货单（演示）`)}>
            补货
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<InventoryRow>
      rowKey="sku"
      size="middle"
      columns={columns}
      dataSource={rows}
      scroll={{ x: 900 }}
      pagination={{ pageSize: 8, hideOnSinglePage: true }}
    />
  );
}
