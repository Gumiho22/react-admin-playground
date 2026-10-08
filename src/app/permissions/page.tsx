import type { Metadata } from 'next';
import { PermissionAdmin } from '@/components/permissions/PermissionAdmin';
import { PageHead } from '@/components/ui/PageHead';

export const metadata: Metadata = {
  title: '权限管理',
};

export default function PermissionsPage() {
  return (
    <>
      <PageHead
        title="权限管理"
        description="基于 mock 数据的 RBAC 权限后台：成员权限、角色权限矩阵与权限清单，改动实时作用于菜单、路由与按钮。"
      />
      <PermissionAdmin />
    </>
  );
}
