import type { Metadata, Viewport } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '云枢运营平台 · 企业后台',
    template: '%s · 云枢运营平台',
  },
  description: '基于 Next.js 14 + React 18 + TypeScript + antd 5 + ECharts 5 的 B 端运营管理后台演示。',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/* 在首次绘制前同步主题，避免深色模式闪白（与 ThemeProvider 共用同一个 storage key） */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('b-admin:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {/* AntdRegistry 负责 App Router 下 antd cssinjs 的样式抽取，避免闪烁 */}
        <AntdRegistry>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
