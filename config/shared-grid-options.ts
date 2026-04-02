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
    accentColor: '#111111',
    backgroundColor: '#fbfaf7',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 18,
    browserColorScheme: 'light',
    chromeBackgroundColor: 'rgba(247, 246, 241, 0.94)',
    foregroundColor: '#111111',
    subtleTextColor: 'rgba(15, 23, 42, 0.52)',
    textColor: '#111111',
    headerBackgroundColor: 'rgba(247, 246, 241, 0.94)',
    headerTextColor: 'rgba(15, 23, 42, 0.78)',
    headerColumnBorder: '1px solid rgba(15, 23, 42, 0.06)',
    headerRowBorder: '1px solid rgba(15, 23, 42, 0.08)',
    rowBorder: true,
    columnBorder: true,
    headerFontWeight: 700,
    oddRowBackgroundColor: 'rgba(15, 23, 42, 0.018)',
    rowHoverColor: 'rgba(17, 17, 17, 0.045)',
    selectedRowBackgroundColor: 'rgba(17, 17, 17, 0.07)',
    sidePanelBorder: true,
    sideBarBackgroundColor: 'rgba(247, 246, 241, 0.96)',
    sideButtonBarBackgroundColor: 'rgba(242, 240, 233, 0.95)',
    sideButtonHoverBackgroundColor: 'rgba(17, 17, 17, 0.06)',
    sideButtonSelectedBackgroundColor: '#111111',
    sideButtonSelectedTextColor: '#ffffff',
    wrapperBorder: '1px solid rgba(15, 23, 42, 0.08)',
    wrapperBorderRadius: 22,
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif', // 优先使用常见中文字体
    cellFontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif',
    headerFontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
    fontSize: 14,
    dataFontSize: 14,
    headerFontSize: 13,
  }),
};
