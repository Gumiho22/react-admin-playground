'use client';

import { useMemo, useState } from 'react';
import { Avatar, Badge, Flex, Input, Progress, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/components/providers/PermissionProvider';
import { ALL_PERMISSIONS } from '@/data/permissions';
import { formatDateTime } from '@/lib/format';
import { countPermissions } from '@/lib/permission';
import type { Member } from '@/types';
import { MemberPermissionDrawer } from './MemberPermissionDrawer';

/**
 * 成员权限总览：把「每个人有什么权限」摊开在一张表里。
 * 角色 / 状态可以直接改（mock 状态，改动立刻影响该账号的菜单与按钮）。
 */
export function MembersTable() {
  const { members, roles, user, roleOf, has, updateMemberRole, toggleMemberStatus } = usePermission();
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  const canManageMember = has('system:member');

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return members.filter((member) => {
      const matchKeyword =
        text.length === 0 ||
        member.name.toLowerCase().includes(text) ||
        member.account.toLowerCase().includes(text) ||
        member.department.toLowerCase().includes(text) ||
        member.title.toLowerCase().includes(text);
      const matchRole = roleFilter === undefined || member.roleId === roleFilter;
      return matchKeyword && matchRole;
    });
  }, [members, keyword, roleFilter]);

  const columns: ColumnsType<Member> = [
    {
      title: '成员',
      dataIndex: 'name',
      width: 230,
      fixed: 'left',
      render: (_: string, member) => (
        <Flex align="center" gap={10}>
          <Avatar style={{ backgroundColor: 'rgba(79,70,229,0.12)', color: '#4f46e5', flex: '0 0 32px' }}>
            {member.name.charAt(0)}
          </Avatar>
          <Flex vertical style={{ lineHeight: 1.35, minWidth: 0 }}>
            <Space size={6}>
              <Typography.Text strong>{member.name}</Typography.Text>
              {member.id === user.id ? <Tag color="processing">当前账号</Tag> : null}
            </Space>
            <Typography.Text type="secondary" className="mono" style={{ fontSize: 12 }}>
              {member.account} · {member.email}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: '部门 / 岗位',
      dataIndex: 'department',
      width: 180,
      render: (_: string, member) => (
        <Flex vertical style={{ lineHeight: 1.35 }}>
          <Typography.Text>{member.department}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {member.title}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleId',
      width: 190,
      render: (roleId: string, member) => {
        const memberRole = roleOf(roleId);
        if (!canManageMember) {
          return <Tag color={memberRole?.color}>{memberRole?.name ?? '未分配'}</Tag>;
        }
        return (
          <Select
            size="small"
            value={roleId}
            style={{ width: 160 }}
            onChange={(next) => updateMemberRole(member.id, next)}
            options={roles.map((role) => ({
              value: role.id,
              label: (
                <Space size={6}>
                  <Tag color={role.color} style={{ marginInlineEnd: 0 }}>
                    {role.name}
                  </Tag>
                </Space>
              ),
            }))}
          />
        );
      },
    },
    {
      title: '有效权限',
      key: 'permissionCount',
      width: 200,
      sorter: (a, b) =>
        countPermissions(a, roleOf(a.roleId)) - countPermissions(b, roleOf(b.roleId)),
      render: (_: unknown, member) => {
        const memberRole = roleOf(member.roleId);
        const isWildcard = (memberRole?.permissions ?? []).includes('*');
        const count = countPermissions(member, memberRole);
        return (
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Space size={6}>
              <Typography.Text strong>
                {count} / {ALL_PERMISSIONS.length}
              </Typography.Text>
              {isWildcard ? <Tag color="red">通配符 *</Tag> : null}
              {(member.extraPermissions?.length ?? 0) > 0 ? (
                <Tooltip title={member.extraPermissions?.join('、')}>
                  <Tag color="blue">+{member.extraPermissions?.length} 额外</Tag>
                </Tooltip>
              ) : null}
              {(member.deniedPermissions?.length ?? 0) > 0 ? (
                <Tooltip title={member.deniedPermissions?.join('、')}>
                  <Tag color="red">-{member.deniedPermissions?.length} 禁用</Tag>
                </Tooltip>
              ) : null}
            </Space>
            <Progress
              percent={Math.round((count / ALL_PERMISSIONS.length) * 100)}
              showInfo={false}
              size="small"
              strokeColor={isWildcard ? '#dc2626' : '#4f46e5'}
              style={{ marginBottom: 0, maxWidth: 150 }}
            />
          </Flex>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      filters: [
        { text: '启用', value: 'active' },
        { text: '已停用', value: 'disabled' },
      ],
      onFilter: (value, member) => member.status === value,
      render: (status: Member['status'], member) =>
        canManageMember ? (
          <Switch
            size="small"
            checked={status === 'active'}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={() => toggleMemberStatus(member.id)}
          />
        ) : (
          <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '启用' : '已停用'} />
        ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 150,
      sorter: (a, b) => a.lastLoginAt.localeCompare(b.lastLoginAt),
      render: (value: string, member) => (
        <Flex vertical style={{ lineHeight: 1.35 }}>
          <span className="mono" style={{ fontSize: 12 }}>
            {formatDateTime(value)}
          </span>
          {member.status === 'disabled' ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              账号已停用
            </Typography.Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_: unknown, member) => (
        <Typography.Link onClick={() => setDetailId(member.id)}>
          <Space size={4}>
            <SafetyCertificateOutlined />
            查看权限
          </Space>
        </Typography.Link>
      ),
    },
  ];

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="搜索姓名 / 账号 / 部门"
          style={{ width: 240 }}
        />
        <Select
          allowClear
          value={roleFilter}
          onChange={setRoleFilter}
          placeholder="全部角色"
          style={{ width: 170 }}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
        />
        <Typography.Text type="secondary" style={{ alignSelf: 'center', fontSize: 12 }}>
          共 {rows.length} 个账号
          {canManageMember ? ' · 可直接调整角色与状态（演示）' : ' · 当前账号仅有查看权限'}
        </Typography.Text>
      </Flex>

      <Table<Member>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `共 ${total} 个账号` }}
      />

      <MemberPermissionDrawer memberId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
