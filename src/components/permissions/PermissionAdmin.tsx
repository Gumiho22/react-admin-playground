'use client';

import { Alert, Button, Card, Col, Flex, Row, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import {
  KeyOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { usePermission } from '@/components/providers/PermissionProvider';
import { ALL_PERMISSIONS } from '@/data/permissions';
import { MembersTable } from './MembersTable';
import { PermissionCatalog } from './PermissionCatalog';
import { RoleMatrix } from './RoleMatrix';

/**
 * 权限后台：谁能进哪些页面、能点哪些按钮，以及每条权限的来源。
 * 三个视角：成员权限（人 → 权限）、角色权限矩阵（角色 → 权限）、权限清单（权限 → 角色）。
 */
export function PermissionAdmin() {
  const { members, roles, user, role, has, resetPermissions } = usePermission();
  const canManageRole = has('system:role');

  const activeCount = members.filter((member) => member.status === 'active').length;
  const disabledCount = members.length - activeCount;

  return (
    <Flex vertical gap={16}>
      <Alert
        type="warning"
        showIcon
        message="权限管理入口当前对所有账号放开显示（临时）"
        description={
          <Flex vertical gap={2}>
            <span>
              页面与菜单不再受 <Typography.Text code>page:permission</Typography.Text> 限制，方便直接验收权限矩阵；
              收敛时把 <Typography.Text code>src/lib/nav.ts</Typography.Text> 里的{' '}
              <Typography.Text code>OPEN_ENTRY_PATHS</Typography.Text> 清空即可。
            </span>
            <span>
              编辑类操作仍按权限收敛：调整角色需要 <Typography.Text code>system:role</Typography.Text>，调整成员需要{' '}
              <Typography.Text code>system:member</Typography.Text>。
            </span>
          </Flex>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} xl={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic title="成员账号" value={members.length} prefix={<TeamOutlined />} valueStyle={{ fontSize: 22 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              启用 {activeCount} · 停用 {disabledCount}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic title="角色数量" value={roles.length} prefix={<SafetyCertificateOutlined />} valueStyle={{ fontSize: 22 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              含 2 个内置角色（超级管理员 / 系统管理员）
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic title="权限项" value={ALL_PERMISSIONS.length} prefix={<KeyOutlined />} valueStyle={{ fontSize: 22 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              覆盖页面访问 / 业务操作 / 数据范围 / 系统管理
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic
              title="停用账号"
              value={disabledCount}
              prefix={<StopOutlined />}
              valueStyle={{ fontSize: 22, color: disabledCount > 0 ? '#d97706' : undefined }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              停用后无法登录（mock 状态）
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space size={10} wrap>
            <span>权限总览</span>
            <Tag color={role?.color} style={{ marginInlineEnd: 0 }}>
              当前账号 {user.name} · {role?.name ?? '未分配'}
            </Tag>
          </Space>
        }
        extra={
          canManageRole ? (
            <Button size="small" icon={<ReloadOutlined />} onClick={resetPermissions}>
              重置为初始 mock 数据
            </Button>
          ) : null
        }
        styles={{ body: { paddingTop: 12 } }}
      >
        <Tabs
          defaultActiveKey="members"
          items={[
            { key: 'members', label: '成员权限', children: <MembersTable /> },
            { key: 'roles', label: '角色权限矩阵', children: <RoleMatrix /> },
            { key: 'catalog', label: '权限清单', children: <PermissionCatalog /> },
          ]}
        />
      </Card>
    </Flex>
  );
}
