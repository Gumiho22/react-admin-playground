'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_MEMBER_ID, MEMBERS, ROLES } from '@/data/permissions';
import {
  hasAnyPermission,
  hasPermission,
  permissionsOfMember,
  permissionSource,
  resolvePermissions,
  type PermissionSource,
} from '@/lib/permission';
import type { Member, Permission, Role } from '@/types';

/**
 * 权限上下文（mock 版）：
 * - `user` / `role` / `permissions` 是「当前登录账号」的有效权限，菜单、路由与按钮都读它；
 * - `members` / `roles` 是可变状态，权限管理页可以直接改角色或调整角色权限矩阵，
 *   改动会立即反映到菜单与按钮上（纯前端状态，刷新回到初始 mock 值）；
 * - 当前账号 id 会写进 localStorage（与主题一样只在 useEffect 里读，避免 hydration 不一致）。
 */

const STORAGE_KEY = 'b-admin:user';

interface PermissionContextValue {
  /** 全部成员（可变） */
  members: Member[];
  /** 全部角色（可变） */
  roles: Role[];
  /** 当前登录账号 */
  user: Member;
  /** 当前账号的角色 */
  role: Role | undefined;
  /** 当前账号的有效权限集合 */
  permissions: Set<string>;
  /** 判断权限：不传 code 视为通过；传数组时「任一满足」即通过 */
  has: (code?: string | readonly string[]) => boolean;
  /** 切换登录账号（演示用） */
  switchUser: (memberId: string) => void;
  /** 任意成员的有效权限集合 */
  permissionsOf: (memberId: string) => Set<string>;
  /** 任意成员的有效权限项（已分组） */
  permissionsListOf: (memberId: string) => Permission[];
  /** 某条权限对该成员的来源（角色 / 额外授予 / 被禁用 / 未授予） */
  sourceOf: (memberId: string, code: string) => PermissionSource;
  /** 角色查找 */
  roleOf: (roleId: string) => Role | undefined;
  /* 权限管理页用到的写操作 */
  updateMemberRole: (memberId: string, roleId: string) => void;
  toggleMemberStatus: (memberId: string) => void;
  toggleRolePermission: (roleId: string, code: string) => void;
  resetPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

function cloneMembers(): Member[] {
  return MEMBERS.map((member) => ({
    ...member,
    extraPermissions: member.extraPermissions ? [...member.extraPermissions] : undefined,
    deniedPermissions: member.deniedPermissions ? [...member.deniedPermissions] : undefined,
  }));
}

function cloneRoles(): Role[] {
  return ROLES.map((role) => ({ ...role, permissions: [...role.permissions] }));
}

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(cloneMembers);
  const [roles, setRoles] = useState<Role[]>(cloneRoles);
  const [currentUserId, setCurrentUserId] = useState<string>(DEFAULT_MEMBER_ID);

  /* 首帧后同步上次选择的账号，避免 SSR / CSR 不一致；已停用账号视为无法登录，回落到默认账号 */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const target = MEMBERS.find((member) => member.id === saved);
      if (target && target.status === 'active') {
        setCurrentUserId(target.id);
      }
    } catch {
      /* 忽略隐私模式下的存储异常 */
    }
  }, []);

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const user = members.find((member) => member.id === currentUserId) ?? members[0];
  const role = roleMap.get(user.roleId);
  const permissions = useMemo(() => resolvePermissions(user, role), [user, role]);

  const switchUser = useCallback(
    (memberId: string) => {
      const target = members.find((member) => member.id === memberId);
      // 已停用账号不允许登录（页面上的「停用后无法登录」由这里保证）
      if (!target || target.status === 'disabled') return;
      setCurrentUserId(memberId);
      try {
        window.localStorage.setItem(STORAGE_KEY, memberId);
      } catch {
        /* ignore */
      }
    },
    [members],
  );

  const roleOf = useCallback((roleId: string) => roleMap.get(roleId), [roleMap]);

  const permissionsOf = useCallback(
    (memberId: string) => {
      const member = members.find((item) => item.id === memberId);
      if (!member) return new Set<string>();
      return resolvePermissions(member, roleMap.get(member.roleId));
    },
    [members, roleMap],
  );

  const permissionsListOf = useCallback(
    (memberId: string) => {
      const member = members.find((item) => item.id === memberId);
      if (!member) return [];
      return permissionsOfMember(member, roleMap.get(member.roleId));
    },
    [members, roleMap],
  );

  const sourceOf = useCallback(
    (memberId: string, code: string): PermissionSource => {
      const member = members.find((item) => item.id === memberId);
      if (!member) return 'none';
      return permissionSource(member, roleMap.get(member.roleId), code);
    },
    [members, roleMap],
  );

  const updateMemberRole = useCallback((memberId: string, roleId: string) => {
    setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, roleId } : member)));
  }, []);

  const toggleMemberStatus = useCallback((memberId: string) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, status: member.status === 'active' ? 'disabled' : 'active' } : member,
      ),
    );
  }, []);

  const toggleRolePermission = useCallback((roleId: string, code: string) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId || role.permissions.includes('*')) return role;
        const next = role.permissions.includes(code)
          ? role.permissions.filter((item) => item !== code)
          : [...role.permissions, code];
        return { ...role, permissions: next };
      }),
    );
  }, []);

  const resetPermissions = useCallback(() => {
    setMembers(cloneMembers());
    setRoles(cloneRoles());
  }, []);

  const has = useCallback(
    (code?: string | readonly string[]) => {
      if (!code) return true;
      if (typeof code === 'string') return hasPermission(permissions, code);
      return hasAnyPermission(permissions, code);
    },
    [permissions],
  );

  const value = useMemo<PermissionContextValue>(
    () => ({
      members,
      roles,
      user,
      role,
      permissions,
      has,
      switchUser,
      permissionsOf,
      permissionsListOf,
      sourceOf,
      roleOf,
      updateMemberRole,
      toggleMemberStatus,
      toggleRolePermission,
      resetPermissions,
    }),
    [
      members,
      roles,
      user,
      role,
      permissions,
      has,
      switchUser,
      permissionsOf,
      permissionsListOf,
      sourceOf,
      roleOf,
      updateMemberRole,
      toggleMemberStatus,
      toggleRolePermission,
      resetPermissions,
    ],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/** 读取权限上下文；必须在 PermissionProvider 内使用 */
export function usePermission(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission 必须在 PermissionProvider 内使用');
  }
  return context;
}
