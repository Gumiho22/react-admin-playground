'use client';

import { Flex, List, Progress } from 'antd';
import { Text } from '@/components/ui/Text';
import type { TaskItem } from '@/types';

/** 我的待办：antd List + Progress（圆环），renderItem 只能在客户端组件中使用 */
export function TodoList({ tasks }: { tasks: TaskItem[] }) {
  return (
    <List
      split={false}
      dataSource={tasks}
      renderItem={(task) => (
        <List.Item style={{ paddingInline: 0 }}>
          <Flex align="center" gap={12} style={{ width: '100%' }}>
            <Progress
              type="circle"
              percent={task.progress}
              size={44}
              strokeColor={task.progress >= 70 ? '#16a34a' : task.progress >= 40 ? '#4f46e5' : '#d97706'}
            />
            <Flex vertical style={{ minWidth: 0, flex: 1 }}>
              <Text strong>{task.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {task.owner} · {task.due}
              </Text>
            </Flex>
          </Flex>
        </List.Item>
      )}
    />
  );
}
