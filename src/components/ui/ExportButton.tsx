'use client';

import { App, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

/** 演示用导出按钮：调用 antd App 上下文里的 message（无需额外 Provider） */
export function ExportButton({
  label = '导出报表',
  content = '报表已开始生成，完成后会通知你（演示）',
  type = 'default',
}: {
  label?: string;
  content?: string;
  type?: 'default' | 'primary' | 'text';
}) {
  const { message } = App.useApp();

  return (
    <Button type={type} icon={<DownloadOutlined />} onClick={() => message.success(content)}>
      {label}
    </Button>
  );
}
