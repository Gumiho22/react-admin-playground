'use client';

import { Alert, Avatar, Badge, Descriptions, Drawer, Flex, Progress, Select, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import { usePermission } from '@/components/providers/PermissionProvider';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/data/permissions';
import { formatDateTime } from '@/lib/format';
import { countPermissions, permissionLabel, type PermissionSource } from '@/lib/permission';

/** 权限来源 → Tag 呈现（颜色 + 文案） */
const SOURCE_META: Record<PermissionSource, { color: string; label: string }> = {
  role: { color: 'green', label: '来自角色' },
  extra: { color: 'blue', label: '额外授予' },
  denied: { color: 'red', label: '被禁用覆盖' },
  none: { color: 'default', label: '未授予' },
};

/**
 * 成员权限明细抽屉：把某个人的有效权限按业务分组摊开，
 * 并标注每条权限的来源（角色 / 额外授予 / 被个人禁用覆盖）。
 */
export function MemberPermissionDrawer({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { members, roles, user, roleOf, permissionsOf, sourceOf, updateMemberRole, has } = usePermission();
  const member = members.find((item) => item.id === memberId);
  const canManageMember = has('system:member');

  if (!member) {
    return <Drawer open={false} onClose={onClose} width={620} />;
  }

  const memberRole = roleOf(member.roleId);
  const granted = permissionsOf(member.id);
  const isWildcard = (memberRole?.permissions ?? []).includes('*');
  const count = countPermissions(member, memberRole);

  return (
    <Drawer
      open={Boolean(memberId)}
      onClose={onClose}
      width={640}
      title={
        <Space size={10}>
          <Avatar style={{ backgroundColor: 'rgba(79,70,229,0.12)', color: '#4f46e5' }}>{member.name.charAt(0)}</Avatar>
          <Flex vertical style={{ lineHeight: 1.35 }}>
            <Space size={6}>
              <Typography.Text strong>{member.name}</Typography.Text>
              {member.id === user.id ? <Tag color="processing">当前账号</Tag> : null}
            </Space>
            <Typography.Text type="secondary" className="mono" style={{ fontSize: 12 }}>
              {member.account}
            </Typography.Text>
          </Flex>
        </Space>
      }
    >
      <Flex vertical gap={16}>
        {member.status === 'disabled' ? (
          <Alert type="warning" showIcon message="该账号已停用，登录时会被拒绝（演示数据）" />
        ) : null}

        <Descriptions size="small" column={2} bordered items={[
          { key: 'dept', label: '部门', children: member.department },
          { key: 'title', label: '岗位', children: member.title },
          { key: 'email', label: '邮箱', children: member.email },
          { key: 'last', label: '最近登录', children: formatDateTime(member.lastLoginAt) },
          {
            key: 'role',
            label: '角色',
            span: 2,
            children: canManageMember ? (
              <Select
                size="small"
                value={member.roleId}
                style={{ width: 240 }}
                onChange={(next) => updateMemberRole(member.id, next)}
                options={roles.map((role) => ({ value: role.id, label: `${role.name} · ${role.description}` }))}
              />
            ) : (
              <Tag color={memberRole?.color}>{memberRole?.name ?? '未分配'}</Tag>
            ),
          },
        ]} />

        <Flex gap={24} wrap>
          <Statistic
            title="有效权限"
            value={count}
            suffix={`/ ${ALL_PERMISSIONS.length}`}
            valueStyle={{ fontSize: 20 }}
          />
          <Flex vertical style={{ minWidth: 200 }}>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              覆盖度
            </Typography.Text>
            <Progress
              percent={Math.round((count / ALL_PERMISSIONS.length) * 100)}
              size="small"
              strokeColor={isWildcard ? '#dc2626' : '#4f46e5'}
              style={{ marginBottom: 0 }}
            />
          </Flex>
          <Flex vertical>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              账号状态
            </Typography.Text>
            <Badge
              status={member.status === 'active' ? 'success' : 'default'}
              text={member.status === 'active' ? '启用' : '已停用'}
            />
          </Flex>
        </Flex>

        {isWildcard ? (
          <Alert type="info" showIcon message="该账号角色为超级管理员（通配符 *），拥有全部权限" />
        ) : null}

        <Flex gap={12} wrap>
          {(Object.keys(SOURCE_META) as PermissionSource[]).map((source) => (
            <Space key={source} size={4}>
              <Tag color={SOURCE_META[source].color} style={{ marginInlineEnd: 0 }}>
                {SOURCE_META[source].label}
              </Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {source === 'role'
                  ? '由角色继承'
                  : source === 'extra'
                    ? '个人额外授予'
                    : source === 'denied'
                      ? '角色有但被禁用'
                      : '角色与个人都没有'}
              </Typography.Text>
            </Space>
          ))}
        </Flex>

        <Flex vertical gap={14}>
          {PERMISSION_GROUPS.map((group) => {
            const groupCount = group.items.filter((item) => granted.has(item.code)).length;
            return (
              <Flex key={group.key} vertical gap={6}>
                <Space size={8}>
                  <Typography.Text strong>{group.label}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {groupCount} / {group.items.length}
                  </Typography.Text>
                </Space>
                <Flex gap={6} wrap>
                  {group.items.map((item) => {
                    const source = sourceOf(member.id, item.code);
                    const meta = SOURCE_META[source];
                    const allowed = source === 'role' || source === 'extra';
                    return (
                      <Tooltip key={item.code} title={`${item.code} · ${item.description}（${meta.label}）`}>
                        <Tag
                          color={meta.color}
                          style={{ marginInlineEnd: 0, opacity: allowed || source === 'denied' ? 1 : 0.45 }}
                        >
                          {item.name}
                          {source === 'extra' ? ' +' : ''}
                          {source === 'denied' ? ' ✕' : ''}
                        </Tag>
                      </Tooltip>
                    );
                  })}
                </Flex>
              </Flex>
            );
          })}
        </Flex>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          有效权限 = 角色权限 ∪ 个人额外授予 − 个人禁用。当前示例账号权限码：
          {[...granted].slice(0, 4).map((code) => permissionLabel(code)).join('、')}
          {granted.size > 4 ? ` 等 ${granted.size} 项` : ''}
        </Typography.Text>
      </Flex>
    </Drawer>
  );
}
