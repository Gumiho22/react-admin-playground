'use client';

import { useMemo, useState } from 'react';
import { Alert, Checkbox, Flex, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/components/providers/PermissionProvider';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, WILDCARD_PERMISSION } from '@/data/permissions';
import type { Permission, Role } from '@/types';

/**
 * 角色权限矩阵：行 = 权限项，列 = 角色，勾选即可调整角色权限。
 * 因为菜单 / 路由 / 按钮都实时读同一份状态，勾完立刻能在左侧菜单看到效果。
 */
export function RoleMatrix() {
  const { roles, members, has, toggleRolePermission } = usePermission();
  const canManageRole = has('system:role');
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);

  const rows = useMemo(
    () => ALL_PERMISSIONS.filter((permission) => groupFilter === undefined || permission.group === groupFilter),
    [groupFilter],
  );

  /** 每个角色当前拥有的权限数量（通配符按全量计） */
  const countOf = (role: Role) =>
    role.permissions.includes(WILDCARD_PERMISSION) ? ALL_PERMISSIONS.length : role.permissions.length;

  /** 每个角色被多少账号使用 */
  const memberCountOf = (roleId: string) => members.filter((member) => member.roleId === roleId).length;

  const columns: ColumnsType<Permission> = [
    {
      title: '权限项',
      dataIndex: 'name',
      width: 250,
      fixed: 'left',
      render: (_: string, permission) => (
        <Flex vertical style={{ lineHeight: 1.35 }}>
          <Typography.Text strong>{permission.name}</Typography.Text>
          <Typography.Text type="secondary" className="mono" style={{ fontSize: 12 }}>
            {permission.code}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: '分组',
      dataIndex: 'group',
      width: 110,
      filters: PERMISSION_GROUPS.map((group) => ({ text: group.label, value: group.label })),
      onFilter: (value, permission) => permission.group === value,
      render: (group: string) => <Tag>{group}</Tag>,
    },
    ...roles.map<ColumnsType<Permission>[number]>((role) => ({
      title: (
        <Tooltip title={`${role.description}（${memberCountOf(role.id)} 个账号在用）`}>
          <Flex vertical align="center" style={{ lineHeight: 1.35 }}>
            <Tag color={role.color} style={{ marginInlineEnd: 0 }}>
              {role.name}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {countOf(role)} 项
            </Typography.Text>
          </Flex>
        </Tooltip>
      ),
      key: role.id,
      width: 118,
      align: 'center' as const,
      render: (_: unknown, permission) => {
        const wildcard = role.permissions.includes(WILDCARD_PERMISSION);
        const checked = wildcard || role.permissions.includes(permission.code);
        const disabled = !canManageRole || wildcard;
        return (
          <Tooltip
            title={
              wildcard
                ? '超级管理员使用通配符 *，不可单独调整'
                : canManageRole
                  ? `${checked ? '取消' : '授予'}「${role.name}」的 ${permission.code}`
                  : '当前账号没有「角色管理」权限，仅可查看'
            }
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onChange={() => toggleRolePermission(role.id, permission.code)}
            />
          </Tooltip>
        );
      },
    })),
  ];

  return (
    <Flex vertical gap={12}>
      <Alert
        type="info"
        showIcon
        message="勾选会立即作用于所有使用该角色的账号（包含当前登录账号），菜单、路由与按钮同步变化"
        description="超级管理员列固定为全选（通配符 *）；这些改动只保存在前端内存，刷新页面回到初始 mock 值。"
      />

      <Flex gap={12} wrap align="center">
        <Select
          allowClear
          value={groupFilter}
          onChange={setGroupFilter}
          placeholder="全部分组"
          style={{ width: 170 }}
          options={PERMISSION_GROUPS.map((group) => ({ value: group.label, label: group.label }))}
        />
        <Space size={6} wrap>
          {roles.map((role) => (
            <Tag key={role.id} color={role.color} style={{ marginInlineEnd: 0 }}>
              {role.name} · {countOf(role)} 项 · {memberCountOf(role.id)} 人
            </Tag>
          ))}
        </Space>
      </Flex>

      <Table<Permission>
        rowKey="code"
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1100 }}
      />
    </Flex>
  );
}
