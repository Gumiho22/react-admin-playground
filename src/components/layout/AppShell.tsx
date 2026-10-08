'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  App,
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
  Tag,
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
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PermissionGuard } from '@/components/layout/PermissionGuard';
import { usePermission } from '@/components/providers/PermissionProvider';
import { useColorMode } from '@/components/providers/ThemeProvider';
import { findNavItem, isOpenEntryPath, navSections, selectedMenuKey, type NavIcon } from '@/lib/nav';

const { Header, Sider, Content } = Layout;

const NAV_ICONS: Record<NavIcon, ReactNode> = {
  dashboard: <DashboardOutlined />,
  analytics: <BarChartOutlined />,
  orders: <ProfileOutlined />,
  customers: <TeamOutlined />,
  product: <AppstoreOutlined />,
  settings: <SettingOutlined />,
  permission: <SafetyCertificateOutlined />,
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
  const { message } = App.useApp();
  const { mode, toggleMode } = useColorMode();
  const { user, role, members, roleOf, has, switchUser } = usePermission();
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

  /* 菜单按当前账号权限过滤：没有权限的入口不渲染（/permissions 属于临时放开） */
  const menuItems = useMemo<NonNullable<MenuProps['items']>>(() => {
    const items: NonNullable<MenuProps['items']> = [];
    for (const section of navSections) {
      const visible = section.items.filter((item) => isOpenEntryPath(item.href) || has(item.permission));
      if (visible.length === 0) continue;
      items.push({
        key: `group-${section.label}`,
        type: 'group',
        label: section.label,
        children: visible.map((item) => ({
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
      });
    }
    return items;
  }, [has]);

  const current = findNavItem(pathname);

  const userMenu: MenuProps = {
    items: [
      {
        key: 'switch-account',
        type: 'group',
        label: '切换账号（演示权限）',
        children: members.map((member) => {
          const memberRole = roleOf(member.roleId);
          return {
            key: `switch:${member.id}`,
            icon: <SwapOutlined />,
            /* 当前账号本身与已停用账号都不可选（停用账号无法登录） */
            disabled: member.id === user.id || member.status === 'disabled',
            label: (
              <Space size={6}>
                <span>{member.name}</span>
                <Tag color={memberRole?.color} style={{ marginInlineEnd: 0 }}>
                  {memberRole?.name ?? '未分配'}
                </Tag>
                {member.status === 'disabled' ? <Tag style={{ marginInlineEnd: 0 }}>已停用</Tag> : null}
              </Space>
            ),
          };
        }),
      },
      { type: 'divider' },
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { key: 'settings', icon: <SettingOutlined />, label: '偏好设置' },
      { key: 'permissions', icon: <SafetyCertificateOutlined />, label: '权限管理' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key.startsWith('switch:')) {
        const memberId = key.slice('switch:'.length);
        const target = members.find((member) => member.id === memberId);
        switchUser(memberId);
        message.success(`已切换为「${target?.name ?? ''}」的视角（演示）`);
        return;
      }
      if (key === 'permissions') {
        router.push('/permissions');
        return;
      }
      message.info('演示环境：该入口暂未接入');
    },
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
              <Avatar style={{ backgroundColor: '#4f46e5' }}>{user.name.charAt(0)}</Avatar>
              {isMobile ? null : (
                <Space size={6}>
                  <span style={{ fontSize: 13 }}>{user.name}</span>
                  <Tag color={role?.color} style={{ marginInlineEnd: 0 }}>
                    {role?.name ?? '未分配'}
                  </Tag>
                </Space>
              )}
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 12 : 20 }}>
          {/* 路由级权限拦截：无权限时渲染 403，不渲染页面内容 */}
          <div style={{ maxWidth: 1560, margin: '0 auto' }}>
            <PermissionGuard>{children}</PermissionGuard>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
