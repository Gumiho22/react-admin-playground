export type NavIcon = 'dashboard' | 'analytics' | 'orders' | 'customers' | 'product' | 'settings';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: '经营概览',
    items: [
      { href: '/', label: '工作台', icon: 'dashboard' },
      { href: '/analytics', label: '数据分析', icon: 'analytics' },
    ],
  },
  {
    label: '业务管理',
    items: [
      { href: '/orders', label: '订单管理', icon: 'orders', badge: '68' },
      { href: '/customers', label: '客户管理', icon: 'customers' },
      { href: '/products', label: '商品管理', icon: 'product' },
    ],
  },
  {
    label: '系统',
    items: [{ href: '/settings', label: '系统设置', icon: 'settings' }],
  },
];

/** 根据 pathname 匹配导航项（支持子路由高亮） */
export function findNavItem(pathname: string): NavItem | undefined {
  const items = navSections.flatMap((section) => section.items);
  return (
    items.find((item) => item.href === pathname) ??
    items.filter((item) => item.href !== '/').find((item) => pathname.startsWith(`${item.href}/`))
  );
}

/** pathname → 当前选中的菜单 key，用于 antd Menu 的 selectedKeys */
export function selectedMenuKey(pathname: string): string {
  return findNavItem(pathname)?.href ?? pathname;
}
