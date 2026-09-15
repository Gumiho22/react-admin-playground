import type { ReactNode } from 'react';
import { Flex } from 'antd';
import { Text, Title } from '@/components/ui/Text';

/** 页面标题区：可在 Server Component 中直接使用（文本组件为客户端包装） */
export function PageHead({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Flex align="flex-end" justify="space-between" gap={16} wrap style={{ marginBottom: 16 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        {description ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <Flex gap={8} wrap>{actions}</Flex> : null}
    </Flex>
  );
}
