'use client';

import { useMemo } from 'react';
import { Avatar, Flex, Progress, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency, formatDate, initials } from '@/lib/format';

export interface CustomerRow {
  company: string;
  contact: string;
  orderCount: number;
  amount: number;
  lastOrderAt: string;
  owner: string;
  levelLabel: string;
  levelColor: string;
}

/** 客户台账：antd Table + Progress（贡献占比），排序与分页交给 Table */
export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const maxAmount = rows[0]?.amount ?? 1;

  const columns: ColumnsType<CustomerRow> = useMemo(
    () => [
      {
        title: '客户',
        dataIndex: 'company',
        width: 240,
        render: (_: string, row: CustomerRow) => (
          <Flex align="center" gap={10}>
            <Avatar style={{ backgroundColor: 'rgba(79,70,229,0.12)', color: '#4f46e5', flex: '0 0 30px' }}>
              {initials(row.company)}
            </Avatar>
            <Flex vertical style={{ lineHeight: 1.35 }}>
              <Typography.Text strong>{row.company}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                联系人 {row.contact}
              </Typography.Text>
            </Flex>
          </Flex>
        ),
      },
      {
        title: '客户等级',
        dataIndex: 'levelLabel',
        width: 120,
        render: (label: string, row: CustomerRow) => <Tag color={row.levelColor}>{label}</Tag>,
      },
      { title: '负责人', dataIndex: 'owner', width: 110 },
      {
        title: '订单数',
        dataIndex: 'orderCount',
        width: 110,
        align: 'right',
        sorter: (a: CustomerRow, b: CustomerRow) => a.orderCount - b.orderCount,
      },
      {
        title: '累计成交额',
        dataIndex: 'amount',
        width: 150,
        align: 'right',
        defaultSortOrder: 'descend',
        sorter: (a: CustomerRow, b: CustomerRow) => a.amount - b.amount,
        render: (amount: number) => <Typography.Text strong>{formatCurrency(amount)}</Typography.Text>,
      },
      {
        title: '贡献占比',
        dataIndex: 'amount',
        key: 'share',
        width: 200,
        render: (amount: number) => (
          <Flex align="center" gap={8}>
            <Progress
              percent={Number(((amount / maxAmount) * 100).toFixed(1))}
              showInfo={false}
              size="small"
              strokeColor="#4f46e5"
              style={{ width: 96, marginBottom: 0 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12, width: 48, textAlign: 'right' }}>
              {((amount / totalAmount) * 100).toFixed(1)}%
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: '最近下单',
        dataIndex: 'lastOrderAt',
        width: 140,
        sorter: (a: CustomerRow, b: CustomerRow) => a.lastOrderAt.localeCompare(b.lastOrderAt),
        render: (value: string) => <span className="mono">{formatDate(value)}</span>,
      },
    ],
    [maxAmount, totalAmount],
  );

  return (
    <Table<CustomerRow>
      rowKey="company"
      size="middle"
      columns={columns}
      dataSource={rows}
      scroll={{ x: 1100 }}
      pagination={{
        pageSize: 8,
        showSizeChanger: true,
        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 家客户`,
      }}
    />
  );
}
