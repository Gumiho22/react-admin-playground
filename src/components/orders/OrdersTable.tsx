'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ExportOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { channelMeta, orderChannels, orderStatuses, statusMeta } from '@/data/mock';
import { formatCurrency, formatDateTime, initials } from '@/lib/format';
import { statusTagColor } from '@/lib/orderDisplay';
import type { Order, OrderChannel, OrderStatus } from '@/types';

/**
 * 订单表格：antd Table 负责排序 / 分页 / 选择，
 * 关键字与状态、渠道筛选由外部受控（工具栏），两者组合使用。
 */
export function OrdersTable({ rows }: { rows: Order[] }) {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [channel, setChannel] = useState<OrderChannel | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const matchKeyword =
        text.length === 0 ||
        row.id.toLowerCase().includes(text) ||
        row.company.toLowerCase().includes(text) ||
        row.customer.toLowerCase().includes(text) ||
        row.owner.toLowerCase().includes(text);
      const matchStatus = status === undefined || row.status === status;
      const matchChannel = channel === undefined || row.channel === channel;
      return matchKeyword && matchStatus && matchChannel;
    });
  }, [rows, keyword, status, channel]);

  const selectedAmount = useMemo(
    () => filtered.filter((row) => selectedKeys.includes(row.id)).reduce((sum, row) => sum + row.amount, 0),
    [filtered, selectedKeys],
  );

  const columns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: '订单号',
        dataIndex: 'id',
        width: 190,
        fixed: 'left',
        render: (id: string) => (
          <Typography.Text className="mono" copyable={{ text: id, tooltips: ['复制订单号', '已复制'] }}>
            {id}
          </Typography.Text>
        ),
      },
      {
        title: '客户',
        dataIndex: 'company',
        width: 220,
        render: (_: string, row: Order) => (
          <Flex align="center" gap={10}>
            <Avatar style={{ backgroundColor: 'rgba(79,70,229,0.12)', color: '#4f46e5', flex: '0 0 30px' }}>
              {initials(row.company)}
            </Avatar>
            <Flex vertical style={{ lineHeight: 1.35 }}>
              <Typography.Text strong>{row.company}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                联系人 {row.customer}
              </Typography.Text>
            </Flex>
          </Flex>
        ),
      },
      {
        title: '渠道',
        dataIndex: 'channel',
        width: 130,
        render: (value: OrderChannel) => <Badge color={channelMeta[value].color} text={value} />,
      },
      {
        title: '订单金额',
        dataIndex: 'amount',
        width: 140,
        align: 'right',
        sorter: (a: Order, b: Order) => a.amount - b.amount,
        render: (amount: number) => <Typography.Text strong>{formatCurrency(amount)}</Typography.Text>,
      },
      {
        title: '商品数',
        dataIndex: 'items',
        width: 100,
        align: 'right',
        sorter: (a: Order, b: Order) => a.items - b.items,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (value: OrderStatus) => <Tag color={statusTagColor(value)}>{statusMeta[value].label}</Tag>,
      },
      { title: '负责人', dataIndex: 'owner', width: 110 },
      {
        title: '下单时间',
        dataIndex: 'createdAt',
        width: 170,
        sorter: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        defaultSortOrder: 'descend',
        render: (value: string) => <span className="mono">{formatDateTime(value)}</span>,
      },
    ],
    [],
  );

  const resetFilters = () => {
    setKeyword('');
    setStatus(undefined);
    setChannel(undefined);
    setSelectedKeys([]);
  };

  return (
    <Card
      title={
        <Space size={12} wrap>
          <span>订单列表</span>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            共 {filtered.length} 条
            {selectedKeys.length > 0 ? ` · 已选 ${selectedKeys.length} 笔，合计 ${formatCurrency(selectedAmount)}` : ''}
          </Typography.Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<ExportOutlined />}
            disabled={selectedKeys.length === 0}
            onClick={() => {
              message.success(`已导出 ${selectedKeys.length} 笔订单（演示）`);
              setSelectedKeys([]);
            }}
          >
            导出所选
          </Button>
        </Space>
      }
      styles={{ body: { paddingTop: 16 } }}
    >
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="搜索订单号 / 客户 / 负责人"
          style={{ width: 260 }}
        />
        <Select
          allowClear
          value={status}
          onChange={setStatus}
          placeholder="全部状态"
          style={{ width: 150 }}
          options={orderStatuses.map((item) => ({ value: item, label: statusMeta[item].label }))}
        />
        <Select
          allowClear
          value={channel}
          onChange={setChannel}
          placeholder="全部渠道"
          style={{ width: 150 }}
          options={orderChannels.map((item) => ({ value: item, label: item }))}
        />
        <Button icon={<ReloadOutlined />} onClick={resetFilters}>
          重置
        </Button>
      </div>

      <Table<Order>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        scroll={{ x: 1180 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
          preserveSelectedRowKeys: true,
        }}
        locale={{ emptyText: <Empty description="没有符合筛选条件的订单，试试调整关键词" /> }}
        pagination={{
          pageSize: 8,
          showSizeChanger: true,
          pageSizeOptions: [8, 16, 32],
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
        }}
        summary={(pageData) => {
          const pageTotal = pageData.reduce((sum, row) => sum + row.amount, 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Typography.Text strong>当前页合计</Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Typography.Text strong>{formatCurrency(pageTotal)}</Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={4} />
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </Card>
  );
}
