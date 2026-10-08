import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_MAP, WILDCARD_PERMISSION } from '@/data/permissions';
import type { Member, Permission, Role } from '@/types';

/**
 * 权限判定的纯函数集合（不依赖 React，服务端 / 客户端都能用）
 *
 * 约定：传数组给 `hasPermission` 表示「任一满足」，空数组表示不需要权限。
 */

/** 计算成员的有效权限集合：角色权限 ∪ 额外授予 − 个人禁用 */
export function resolvePermissions(member: Member, role: Role | undefined): Set<string> {
  const granted = new Set<string>(role?.permissions ?? []);
  for (const code of member.extraPermissions ?? []) {
    granted.add(code);
  }
  for (const code of member.deniedPermissions ?? []) {
    granted.delete(code);
  }
  return granted;
}

/** 单个权限码判定（支持 `*` 通配符） */
export function hasPermission(granted: ReadonlySet<string>, code?: string): boolean {
  if (!code) return true;
  if (granted.has(WILDCARD_PERMISSION)) return true;
  return granted.has(code);
}

/** 多个权限码判定：任一满足即可 */
export function hasAnyPermission(granted: ReadonlySet<string>, codes?: readonly string[]): boolean {
  if (!codes || codes.length === 0) return true;
  if (granted.has(WILDCARD_PERMISSION)) return true;
  return codes.some((code) => granted.has(code));
}

/** 权限码的可读名称（用于提示文案） */
export function permissionLabel(code?: string): string {
  if (!code) return '访问';
  if (code === WILDCARD_PERMISSION) return '全部权限';
  return PERMISSION_MAP[code]?.name ?? code;
}

/** 该成员的有效权限项（已按业务分组、保持清单顺序） */
export function permissionsOfMember(member: Member, role: Role | undefined): Permission[] {
  const granted = resolvePermissions(member, role);
  const wildcard = granted.has(WILDCARD_PERMISSION);
  return PERMISSION_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => wildcard || granted.has(item.code))
      .map((item) => ({ ...item, group: group.label })),
  );
}

/** 权限来源：用于权限明细里给 Tag 上色 */
export type PermissionSource = 'role' | 'extra' | 'denied' | 'none';

/** 判断某条权限对某个成员来说来自哪里 */
export function permissionSource(member: Member, role: Role | undefined, code: string): PermissionSource {
  if ((member.deniedPermissions ?? []).includes(code)) return 'denied';
  if ((member.extraPermissions ?? []).includes(code)) return 'extra';
  const rolePermissions = role?.permissions ?? [];
  if (rolePermissions.includes(WILDCARD_PERMISSION) || rolePermissions.includes(code)) return 'role';
  return 'none';
}

/** 统计成员的有效权限数量（通配符按全量计） */
export function countPermissions(member: Member, role: Role | undefined): number {
  const granted = resolvePermissions(member, role);
  if (granted.has(WILDCARD_PERMISSION)) return ALL_PERMISSIONS.length;
  return ALL_PERMISSIONS.filter((permission) => granted.has(permission.code)).length;
}
