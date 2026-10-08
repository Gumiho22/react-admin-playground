'use client';

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import { usePermission } from '@/components/providers/PermissionProvider';
import { permissionLabel } from '@/lib/permission';

export interface PermissionGateProps {
  /** 需要的权限码；传数组表示「任一满足」 */
  code: string | readonly string[];
  /**
   * `disable`（默认）：无权限时给子元素加上 disabled 并禁用点击，配合 Tooltip 说明原因；
   * `hide`：无权限时直接不渲染。
   *
   * ⚠️ `disable` 要求子元素支持 `disabled`（antd Button / 本项目的导出按钮都支持）；
   * 对 `next/link` 这类不接受 disabled 的元素请改用 `mode="hide"`，把整个 Link 一起隐藏。
   */
  mode?: 'disable' | 'hide';
  /** 自定义提示文案（默认「当前账号无「XX」权限」） */
  tip?: string;
  children: ReactNode;
}

/**
 * 声明式权限门禁：Server Component 里也能直接用（children 作为 RSC 子节点传入）。
 *
 * ```tsx
 * <PermissionGate code="order:create">
 *   <Button type="primary">新建订单</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ code, mode = 'disable', tip, children }: PermissionGateProps) {
  const { has } = usePermission();
  const allowed = has(code);

  if (allowed) return <>{children}</>;
  if (mode === 'hide') return null;

  const first = Children.toArray(children)[0];
  const reason =
    tip ??
    `当前账号无「${
      typeof code === 'string' ? permissionLabel(code) : code.map((item) => permissionLabel(item)).join(' / ')
    }」权限`;

  if (isValidElement<{ disabled?: boolean }>(first)) {
    // 只有子元素还没被业务自己禁用时才补 disabled，避免覆盖原有语义
    const element = first.props.disabled ? first : cloneElement(first as ReactElement<{ disabled?: boolean }>, { disabled: true });
    return (
      <Tooltip title={reason}>
        <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>{element}</span>
      </Tooltip>
    );
  }

  return null;
}
