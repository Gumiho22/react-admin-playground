'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Typography } from 'antd';

/**
 * antd Typography 的客户端包装。
 *
 * 为什么需要它：Next 14 默认对 antd 开启 barrel 优化（optimizePackageImports），
 * 在 Server Component 中访问复合组件成员（Typography.Title / List.Item / Table.Summary …）
 * 会命中 Next 的已知缺陷：
 *   "Could not find the module ...__barrel_optimize__...#Typography#Title in the React Client Manifest"
 * 把复合成员访问收敛到一个 'use client' 模块里即可规避，同时对外仍是普通组件、props 全部可序列化。
 */
export function Text({
  children,
  type,
  strong,
  style,
  className,
  copyable,
}: {
  children: ReactNode;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  strong?: boolean;
  style?: CSSProperties;
  className?: string;
  copyable?: boolean | { text: string; tooltips?: [string, string] };
}) {
  return (
    <Typography.Text type={type} strong={strong} style={style} className={className} copyable={copyable}>
      {children}
    </Typography.Text>
  );
}

export function Title({
  children,
  level = 4,
  style,
}: {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  style?: CSSProperties;
}) {
  return (
    <Typography.Title level={level} style={style}>
      {children}
    </Typography.Title>
  );
}

export function Paragraph({
  children,
  type,
  style,
}: {
  children: ReactNode;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  style?: CSSProperties;
}) {
  return (
    <Typography.Paragraph type={type} style={style}>
      {children}
    </Typography.Paragraph>
  );
}
