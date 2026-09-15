import type { Metadata } from 'next';
import { PageHead } from '@/components/ui/PageHead';
import { SettingsPanels } from '@/components/settings/SettingsPanels';

export const metadata: Metadata = {
  title: '系统设置',
};

export default function SettingsPage() {
  return (
    <>
      <PageHead
        title="系统设置"
        description="分组卡片式配置表单，交互控件使用 antd Switch / Select / Button，操作反馈走 message。"
      />
      <SettingsPanels />
    </>
  );
}
