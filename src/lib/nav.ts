export type NavIcon = 'dashboard' | 'analytics' | 'orders' | 'customers' | 'product' | 'settings' | 'permission';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: string;
  /** 访问该页面所需的权限码；不填表示人人可见 */
  permission?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * 临时放开显示的入口：这些路由的菜单项与路由拦截都放行（仅用于演示 / 验收）。
 * 接入真实鉴权后把这里清空即可，权限管理页会回到 `page:permission` 控制。
 */
export const OPEN_ENTRY_PATHS: readonly string[] = ['/permissions'];

export const navSections: NavSection[] = [
  {
    label: '经营概览',
    items: [
      { href: '/', label: '工作台', icon: 'dashboard', permission: 'page:dashboard' },
      { href: '/analytics', label: '数据分析', icon: 'analytics', permission: 'page:analytics' },
    ],
  },
  {
    label: '业务管理',
    items: [
      { href: '/orders', label: '订单管理', icon: 'orders', badge: '68', permission: 'page:orders' },
      { href: '/customers', label: '客户管理', icon: 'customers', permission: 'page:customers' },
      { href: '/products', label: '商品管理', icon: 'product', permission: 'page:products' },
    ],
  },
  {
    label: '系统',
    items: [
      { href: '/permissions', label: '权限管理', icon: 'permission', permission: 'page:permission' },
      { href: '/settings', label: '系统设置', icon: 'settings', permission: 'page:settings' },
    ],
  },
];

/** 全部导航项（拍平） */
export function allNavItems(): NavItem[] {
  return navSections.flatMap((section) => section.items);
}

/** 根据 pathname 匹配导航项（支持子路由高亮） */
export function findNavItem(pathname: string): NavItem | undefined {
  const items = allNavItems();
  return (
    items.find((item) => item.href === pathname) ??
    items.filter((item) => item.href !== '/').find((item) => pathname.startsWith(`${item.href}/`))
  );
}

/** pathname → 当前选中的菜单 key，用于 antd Menu 的 selectedKeys */
export function selectedMenuKey(pathname: string): string {
  return findNavItem(pathname)?.href ?? pathname;
}

/** pathname 对应的权限码（未配置则返回 undefined，表示不限制） */
export function requiredPermissionForPath(pathname: string): string | undefined {
  return findNavItem(pathname)?.permission;
}

/** 是否属于「临时放开」的入口 */
export function isOpenEntryPath(pathname: string): boolean {
  return OPEN_ENTRY_PATHS.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}
