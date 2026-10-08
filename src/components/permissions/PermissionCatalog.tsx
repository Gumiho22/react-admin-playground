'use client';

import { useMemo, useState } from 'react';
import { Card, Col, Empty, Flex, Input, Row, Space, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { usePermission } from '@/components/providers/PermissionProvider';
import { PERMISSION_GROUPS, WILDCARD_PERMISSION } from '@/data/permissions';

/** 权限清单：权限码的权威定义，并反查「哪些角色拥有它」 */
export function PermissionCatalog() {
  const { roles } = usePermission();
  const [keyword, setKeyword] = useState('');

  /** 权限码 → 拥有它的角色 */
  const roleIndex = useMemo(() => {
    const index = new Map<string, string[]>();
    for (const group of PERMISSION_GROUPS) {
      for (const item of group.items) {
        index.set(
          item.code,
          roles
            .filter(
              (role) => role.permissions.includes(WILDCARD_PERMISSION) || role.permissions.includes(item.code),
            )
            .map((role) => role.id),
        );
      }
    }
    return index;
  }, [roles]);

  const text = keyword.trim().toLowerCase();
  const visibleGroups = PERMISSION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        text.length === 0 ||
        item.name.toLowerCase().includes(text) ||
        item.code.toLowerCase().includes(text) ||
        item.description.toLowerCase().includes(text),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <Flex vertical gap={12}>
      <Flex gap={12} wrap align="center">
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="搜索权限名称 / 权限码"
          style={{ width: 260 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          共 {PERMISSION_GROUPS.reduce((sum, group) => sum + group.items.length, 0)} 项权限 ·{' '}
          {PERMISSION_GROUPS.length} 个分组 · 权限码格式统一为 <Typography.Text code>资源:动作</Typography.Text>
        </Typography.Text>
      </Flex>

      {visibleGroups.length === 0 ? <Empty description="没有匹配的权限项" /> : null}

      <Row gutter={[16, 16]}>
        {visibleGroups.map((group) => (
          <Col key={group.key} xs={24} xl={12}>
            <Card
              title={group.label}
              extra={
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {group.items.length} 项
                </Typography.Text>
              }
              styles={{ body: { paddingTop: 12 } }}
            >
              <Flex vertical gap={10}>
                {group.items.map((item) => (
                  <Flex key={item.code} vertical gap={4}>
                    <Space size={8} wrap>
                      <Typography.Text strong>{item.name}</Typography.Text>
                      <Typography.Text className="mono" type="secondary" style={{ fontSize: 12 }}>
                        {item.code}
                      </Typography.Text>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.description}
                    </Typography.Text>
                    <Space size={4} wrap>
                      {(roleIndex.get(item.code) ?? []).map((roleId) => {
                        const role = roles.find((candidate) => candidate.id === roleId);
                        if (!role) return null;
                        return (
                          <Tag key={roleId} color={role.color} style={{ marginInlineEnd: 0 }}>
                            {role.name}
                          </Tag>
                        );
                      })}
                      {(roleIndex.get(item.code) ?? []).length === 0 ? (
                        <Tag style={{ marginInlineEnd: 0 }}>暂无角色拥有</Tag>
                      ) : null}
                    </Space>
                  </Flex>
                ))}
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
    </Flex>
  );
}
