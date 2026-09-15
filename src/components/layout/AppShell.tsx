'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Input,
  Layout,
  Menu,
  Space,
  Switch,
  Tooltip,
  theme,
  type MenuProps,
} from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useColorMode } from '@/components/providers/ThemeProvider';
import { findNavItem, navSections, selectedMenuKey, type NavIcon } from '@/lib/nav';

const { Header, Sider, Content } = Layout;

const NAV_ICONS: Record<NavIcon, ReactNode> = {
  dashboard: <DashboardOutlined />,
  analytics: <BarChartOutlined />,
  orders: <ProfileOutlined />,
  customers: <TeamOutlined />,
  product: <AppstoreOutlined />,
  settings: <SettingOutlined />,
};

const SIDER_BG = '#101528';

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 60,
        padding: collapsed ? 0 : '0 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 32px',
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
          color: '#fff',
          fontWeight: 700,
        }}
      >
        云
      </span>
      {collapsed ? null : (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#fff', fontSize: 14 }}>云枢运营平台</strong>
          <span style={{ color: '#6c7a99', fontSize: 11 }}>Enterprise Console</span>
        </span>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();
  const { mode, toggleMode } = useColorMode();
  const screens = Grid.useBreakpoint();

  /* SSR 阶段 screens 为空对象，用 === false 判断可保证首帧与 SSR 一致，避免 hydration 不一致 */
  const isMobile = screens.lg === false;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('b-admin:collapsed') === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('b-admin:collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  /* Ctrl/Cmd + B 折叠侧栏 */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const menuItems = useMemo<MenuProps['items']>(
    () =>
      navSections.map((section) => ({
        key: `group-${section.label}`,
        type: 'group' as const,
        label: section.label,
        children: section.items.map((item) => ({
          key: item.href,
          icon: NAV_ICONS[item.icon],
          label: item.badge ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {item.label}
              <Badge count={item.badge} size="small" color="#6366f1" />
            </span>
          ) : (
            item.label
          ),
        })),
      })),
    [],
  );

  const current = findNavItem(pathname);

  const userMenu: MenuProps = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { key: 'settings', icon: <SettingOutlined />, label: '偏好设置' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
  };

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      items={menuItems}
      selectedKeys={[selectedMenuKey(pathname)]}
      onClick={({ key }) => {
        router.push(key);
        setDrawerOpen(false);
      }}
      style={{ borderInlineEnd: 'none', background: SIDER_BG, paddingTop: 8 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={248}
          closable={false}
          styles={{ body: { padding: 0, background: SIDER_BG }, header: { display: 'none' } }}
        >
          <Brand collapsed={false} />
          {menu}
        </Drawer>
      ) : (
        <Sider
          theme="dark"
          width={236}
          collapsedWidth={68}
          collapsed={collapsed}
          trigger={null}
          style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
        >
          <Brand collapsed={collapsed} />
          {menu}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            aria-label={isMobile ? '打开导航' : collapsed ? '展开侧栏' : '折叠侧栏'}
            icon={collapsed && !isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={isMobile ? () => setDrawerOpen(true) : toggleCollapsed}
          />

          {isMobile ? null : (
            <Breadcrumb
              items={[{ title: '云枢运营平台' }, { title: current?.label ?? '页面' }]}
              style={{ fontSize: 13 }}
            />
          )}

          <div style={{ flex: 1 }} />

          {isMobile ? null : (
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="搜索订单 / 客户 / 商品"
              style={{ width: 250 }}
            />
          )}

          <Tooltip title={mode === 'dark' ? '切换到浅色主题' : '切换到深色主题'}>
            <Switch
              checked={mode === 'dark'}
              onChange={toggleMode}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              aria-label="切换深浅色主题"
            />
          </Tooltip>

          <Tooltip title="帮助中心">
            <Button type="text" icon={<QuestionCircleOutlined />} aria-label="帮助中心" />
          </Tooltip>

          <Tooltip title="通知">
            <Badge dot offset={[-4, 4]}>
              <Button type="text" icon={<BellOutlined />} aria-label="通知" />
            </Badge>
          </Tooltip>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer', paddingInline: 4 }}>
              <Avatar style={{ backgroundColor: '#4f46e5' }}>王</Avatar>
              {isMobile ? null : <span style={{ fontSize: 13 }}>王思远</span>}
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 12 : 20 }}>
          <div style={{ maxWidth: 1560, margin: '0 auto' }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
