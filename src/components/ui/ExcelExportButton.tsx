'use client';

import { useCallback, useState } from 'react';
import { App, Button } from 'antd';
import type { ButtonProps } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadExcel, saveExcelFile, type AnyExcelSheet } from '@/lib/xlsx';

export interface ExcelExportOptions {
  /** 文件名（不含扩展名），缺省为「首个工作表名 + 导出日期」 */
  fileName?: string;
  /** 走「另存为」：优先用 File System Access API 选择本地保存位置，浏览器不支持时自动回退为下载 */
  saveAs?: boolean;
  /** 成功提示；传 false 关闭 */
  successMessage?: string | false;
}

/** 工作表集合：函数形式会在点击时才求值，适合导出「当前筛选结果 / 勾选行」 */
export type ExcelSheetSource = readonly AnyExcelSheet[] | (() => readonly AnyExcelSheet[]);

export interface UseExcelExportResult {
  /** 触发一次本地导出，返回实际文件名；无数据或用户取消时返回 null */
  exportExcel: (sheets: ExcelSheetSource, options?: ExcelExportOptions) => Promise<string | null>;
  exporting: boolean;
}

/**
 * 命令式导出：适用于没有按钮、或需要在其他交互（右键菜单、快捷键、表格工具栏）里导出 Excel 的场景。
 * 组件内部也复用它（见下方 `ExcelExportButton`）。
 */
export function useExcelExport(): UseExcelExportResult {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  const exportExcel = useCallback<UseExcelExportResult['exportExcel']>(
    async (sheets, options = {}) => {
      try {
        const list = typeof sheets === 'function' ? sheets() : sheets;
        if (!list || list.length === 0) {
          message.warning('没有可导出的数据');
          return null;
        }
        setExporting(true);
        const fileName = options.saveAs
          ? await saveExcelFile(list, options.fileName)
          : downloadExcel(list, options.fileName);
        if (fileName && options.successMessage !== false) {
          message.success(options.successMessage ?? `已导出「${fileName}」`);
        }
        return fileName;
      } catch (error) {
        message.error(error instanceof Error ? error.message : '导出失败，请稍后重试');
        return null;
      } finally {
        setExporting(false);
      }
    },
    [message],
  );

  return { exportExcel, exporting };
}

export interface ExcelExportButtonProps extends Omit<ButtonProps, 'onClick' | 'loading' | 'children'> {
  /** 一个或多个工作表；传函数则在点击时求值 */
  sheets: ExcelSheetSource;
  /** 文件名（不含扩展名），缺省按「首个工作表的图表名 → 工作表名 → 导出数据」动态生成 */
  fileName?: string;
  /**
   * 走「另存为」：调用 File System Access API 弹出系统保存对话框（可选能力，默认关闭）。
   * 注意：这条路径的文件名最终由系统对话框决定，若对话框里名字被清空，可能落盘成 `.xlsx`
   * 这种「只有扩展名」的文件导致打不开；内核会校验真实文件名并回退为普通下载。
   * 正常情况下建议使用默认的浏览器下载（文件名完全可控、兼容性最好）。
   */
  saveAs?: boolean;
  /** 成功提示；传 false 关闭 */
  successMessage?: string | false;
  /** 导出前守卫，返回 false 取消本次导出（例如二次确认） */
  beforeExport?: () => boolean | void;
  /** 按钮文案（`label` 与 `children` 二选一，都没有时显示「导出 Excel」） */
  label?: ButtonProps['children'];
  children?: ButtonProps['children'];
  /** 导出完成回调，参数为实际文件名 */
  onExported?: (fileName: string) => void;
}

/**
 * 通用「导出 Excel」按钮：本地生成 .xlsx 文件并下载，不经服务端、无第三方依赖。
 *
 * ```tsx
 * <ExcelExportButton
 *   fileName="客户清单"
 *   sheets={[
 *     defineSheet<CustomerRow>({
 *       name: '客户列表',
 *       title: '客户台账',
 *       note: `导出时间 ${new Date().toLocaleString('zh-CN')}`,
 *       columns: [
 *         { title: '客户', key: 'company', width: 24 },
 *         { title: '累计成交额', key: 'amount', type: 'currency' },
 *         { title: '贡献占比', key: 'share', type: 'percent' },
 *       ],
 *       rows: customers,
 *       total: true,
 *     }),
 *   ]}
 * >
 *   导出客户
 * </ExcelExportButton>
 * ```
 */
export function ExcelExportButton({
  sheets,
  fileName,
  saveAs = false,
  successMessage,
  beforeExport,
  onExported,
  label,
  children,
  icon = <DownloadOutlined />,
  ...rest
}: ExcelExportButtonProps) {
  const { exportExcel, exporting } = useExcelExport();

  const handleClick = () => {
    if (beforeExport && beforeExport() === false) return;
    void exportExcel(sheets, { fileName, saveAs, successMessage }).then((name) => {
      if (name) onExported?.(name);
    });
  };

  return (
    <Button {...rest} icon={icon} loading={exporting} onClick={handleClick}>
      {label ?? children ?? '导出 Excel'}
    </Button>
  );
}
