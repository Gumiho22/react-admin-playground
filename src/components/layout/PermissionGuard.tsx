'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Card, Flex, Result, Space, Tag, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { usePermission } from '@/components/providers/PermissionProvider';
import { findNavItem, isOpenEntryPath, requiredPermissionForPath } from '@/lib/nav';
import { permissionLabel } from '@/lib/permission';

/**
 * 路由级权限拦截：pathname 命中导航里配置的权限码且当前账号没有该权限时，
 * 渲染 403 视图（不渲染页面内容），并给出账号 / 角色 / 缺失权限的明确原因。
 *
 * 说明：这是**前端门禁**，只负责演示与体验；真实项目里同一套权限码还要在
 * 服务端（Route Handler / BFF）再校验一次，前端拦截不能当作安全边界。
 */
export function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, role, has, members, switchUser } = usePermission();

  const required = requiredPermissionForPath(pathname);
  const openEntry = isOpenEntryPath(pathname);

  if (!required || openEntry || has(required)) {
    return <>{children}</>;
  }

  const current = findNavItem(pathname);

  return (
    <Result
      status="403"
      icon={<SafetyCertificateOutlined style={{ color: '#d97706' }} />}
      title="暂无访问权限"
      subTitle={
        <Flex vertical gap={6} align="center">
          <span>
            页面「{current?.label ?? pathname}」需要权限
            <Typography.Text code>{required}</Typography.Text>
            （{permissionLabel(required)}）
          </span>
          <Space size={6} wrap style={{ justifyContent: 'center' }}>
            <span>当前账号</span>
            <Tag color="blue">{user.name}</Tag>
            <span>角色</span>
            <Tag color={role?.color}>{role?.name ?? '未分配'}</Tag>
          </Space>
        </Flex>
      }
      extra={
        <Flex vertical gap={12} align="center">
          <Space wrap>
            <Link href="/">
              <Button type="primary">返回工作台</Button>
            </Link>
            <Link href="/permissions">
              <Button>查看权限矩阵</Button>
            </Link>
          </Space>
          <Card size="small" title="切换到有权限的账号（演示）" style={{ textAlign: 'left', maxWidth: 460 }}>
            <Space wrap size={6}>
              {members
                .filter((member) => member.id !== user.id && member.status === 'active')
                .map((member) => (
                  <Button key={member.id} size="small" onClick={() => switchUser(member.id)}>
                    {member.name}
                  </Button>
                ))}
            </Space>
          </Card>
        </Flex>
      }
    />
  );
}
