import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale';
import { type GridOptions, themeQuartz } from 'ag-grid-community';
import GridLoading from '~/components/grid/Loading.vue';
import GridNoRows from '~/components/grid/NoRows.vue';

// 创建自定义的中文本地化，覆盖 columns 键
const customLocaleText = {
  ...AG_GRID_LOCALE_CN,
  columns: '配置字段',
};

/**
 * Grid表格公共配置
 */
export const sharedGridOptions: GridOptions = {
  localeText: customLocaleText,
  rowNumbers: {
    resizable: true,
    minWidth: 80,
    maxWidth: 120,
  },
  loadingOverlayComponent: GridLoading,
  noRowsOverlayComponent: GridNoRows,
  sideBar: {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        minWidth: 225,
        maxWidth: 225,
        width: 225,
        toolPanelParams: {
          suppressRowGroups: true,
          suppressValues: true,
          suppressPivotMode: true,
        },
      },
    ],
    position: 'right',
  },
  enableCellTextSelection: true,
  tooltipShowDelay: 0,
  tooltipShowMode: 'whenTruncated',
  suppressContextMenu: true,
  defaultColDef: {
    sortable: true,
    filter: true,
    flex: 1,
    enableCellChangeFlash: false,
    suppressHeaderMenuButton: true,
    suppressHeaderContextMenu: true,
    enableValue: true,
    enableRowGroup: true,
  },
  selectionColumnDef: {
    sortable: true,
    width: 80,
    pinned: 'left',
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    selectAll: 'filtered',
  },
  theme: themeQuartz.withParams({
    accentColor: '#2563eb',
    backgroundColor: '#f7fafe',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 16,
    browserColorScheme: 'light',
    chromeBackgroundColor: 'rgba(241, 245, 249, 0.94)',
    foregroundColor: '#111111',
    subtleTextColor: 'rgba(15, 23, 42, 0.56)',
    textColor: '#111111',
    headerBackgroundColor: 'rgba(241, 245, 249, 0.96)',
    headerTextColor: 'rgba(15, 23, 42, 0.78)',
    headerColumnBorder: '1px solid rgba(148, 163, 184, 0.14)',
    headerRowBorder: '1px solid rgba(148, 163, 184, 0.18)',
    rowBorder: true,
    columnBorder: true,
    headerFontWeight: 700,
    oddRowBackgroundColor: 'rgba(37, 99, 235, 0.018)',
    rowHoverColor: 'rgba(37, 99, 235, 0.06)',
    selectedRowBackgroundColor: 'rgba(37, 99, 235, 0.1)',
    sidePanelBorder: true,
    sideBarBackgroundColor: 'rgba(241, 245, 249, 0.98)',
    sideButtonBarBackgroundColor: 'rgba(236, 242, 248, 0.98)',
    sideButtonHoverBackgroundColor: 'rgba(37, 99, 235, 0.08)',
    sideButtonSelectedBackgroundColor: '#0f172a',
    sideButtonSelectedTextColor: '#ffffff',
    wrapperBorder: '1px solid rgba(148, 163, 184, 0.18)',
    wrapperBorderRadius: 18,
    fontFamily:
      '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif',
    cellFontFamily:
      '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif',
    headerFontFamily: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
    fontSize: 14,
    dataFontSize: 14,
    headerFontSize: 13,
  }),
};
