'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export type ColorMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: ColorMode;
  toggleMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({ mode: 'light', toggleMode: () => {} });

/** 读取 / 切换深浅色（图表与自定义样式都从这里取色） */
export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}

const STORAGE_KEY = 'b-admin:theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('light');

  /* 首帧后同步本地偏好；layout 里的内联脚本已先行设置 data-theme，避免闪白 */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
        return;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setMode('dark');
      }
    } catch {
      /* 忽略隐私模式下的存储异常 */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ColorMode = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#4f46e5',
            colorInfo: '#4f46e5',
            colorSuccess: '#16a34a',
            colorWarning: '#d97706',
            colorError: '#dc2626',
            borderRadius: 8,
            fontSize: 14,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
          },
          components: {
            Layout: {
              siderBg: '#101528',
              headerHeight: 60,
              headerPadding: '0 16px',
            },
            Menu: {
              darkItemBg: '#101528',
              darkSubMenuItemBg: '#101528',
              darkItemColor: '#9aa6bf',
              darkItemHoverBg: 'rgba(255,255,255,0.08)',
              darkItemSelectedBg: 'rgba(99,102,241,0.24)',
              darkItemSelectedColor: '#ffffff',
            },
            Table: {
              headerBg: mode === 'dark' ? '#1a2036' : '#f8fafc',
            },
          },
        }}
      >
        {/* AntdApp 提供 message / notification / modal 的静态方法上下文 */}
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
}
