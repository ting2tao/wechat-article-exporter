import type {
  ScheduledExportDateRangeType,
  ScheduledExportFormat,
  WorkerSchedulerConfig,
} from '../../../types/worker-scheduler.ts';

export const SCHEDULED_EXPORT_FORMATS = ['html', 'txt', 'markdown'] as const satisfies readonly ScheduledExportFormat[];
export const SCHEDULED_EXPORT_DATE_RANGE_TYPES = [
  'all',
  'recentDays',
  'customRange',
] as const satisfies readonly ScheduledExportDateRangeType[];

const DEFAULT_RECENT_DAYS = 3;
const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseStoredStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function normalizeStringArray(value: readonly (string | null | undefined)[] | null | undefined) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value || []) {
    const normalized = item?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function normalizeSelectedAccountFakeids(value: readonly (string | null | undefined)[] | null | undefined) {
  return normalizeStringArray(value);
}

export function normalizeSelectedExportFormats(
  value: readonly (string | null | undefined)[] | null | undefined
): ScheduledExportFormat[] {
  const allowed = new Set<string>(SCHEDULED_EXPORT_FORMATS);
  const result: ScheduledExportFormat[] = [];
  const seen = new Set<ScheduledExportFormat>();

  for (const item of value || []) {
    const normalized = item?.trim();
    if (!normalized || !allowed.has(normalized) || seen.has(normalized as ScheduledExportFormat)) {
      continue;
    }

    const format = normalized as ScheduledExportFormat;
    seen.add(format);
    result.push(format);
  }

  return result;
}

export function normalizeScheduledExportDateRangeType(value: string | null | undefined): ScheduledExportDateRangeType {
  return SCHEDULED_EXPORT_DATE_RANGE_TYPES.includes(value as ScheduledExportDateRangeType)
    ? (value as ScheduledExportDateRangeType)
    : 'all';
}

export function normalizeScheduledExportRecentDays(value: number | string | null | undefined) {
  return Math.max(1, Number(value) || DEFAULT_RECENT_DAYS);
}

function isValidDateInput(value: string) {
  const match = DATE_INPUT_RE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeScheduledExportDate(value: string | null | undefined) {
  const normalized = value?.trim() || '';
  return isValidDateInput(normalized) ? normalized : '';
}

function getDateStartUnix(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(new Date(year, month - 1, day, 0, 0, 0, 0).getTime() / 1000);
}

function getDateEndUnix(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(new Date(year, month - 1, day, 23, 59, 59, 999).getTime() / 1000);
}

export function resolveScheduledExportDateRange(config: {
  downloadDateRangeType: ScheduledExportDateRangeType;
  downloadRecentDays: number;
  downloadDateStart: string;
  downloadDateEnd: string;
}) {
  if (config.downloadDateRangeType === 'recentDays') {
    const recentDays = normalizeScheduledExportRecentDays(config.downloadRecentDays);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (recentDays - 1), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      startTime: Math.floor(start.getTime() / 1000),
      endTime: Math.floor(end.getTime() / 1000),
    };
  }

  if (config.downloadDateRangeType === 'customRange') {
    const start = normalizeScheduledExportDate(config.downloadDateStart);
    const end = normalizeScheduledExportDate(config.downloadDateEnd);
    return {
      startTime: start ? getDateStartUnix(start) : null,
      endTime: end ? getDateEndUnix(end) : null,
    };
  }

  return {
    startTime: null,
    endTime: null,
  };
}

export function validateSchedulerConfigSelection(config: {
  syncEnabled: boolean;
  downloadEnabled: boolean;
  selectedAccountFakeids: string[];
  selectedExportFormats: ScheduledExportFormat[];
  downloadDateRangeType: ScheduledExportDateRangeType;
  downloadRecentDays: number;
  downloadDateStart: string;
  downloadDateEnd: string;
}) {
  if ((config.syncEnabled || config.downloadEnabled) && config.selectedAccountFakeids.length === 0) {
    return '启用后台任务前，请至少选择一个公众号';
  }

  if (!config.downloadEnabled) {
    return '';
  }

  if (
    config.downloadDateRangeType === 'recentDays' &&
    normalizeScheduledExportRecentDays(config.downloadRecentDays) < 1
  ) {
    return '最近导出天数至少为 1 天';
  }

  if (config.downloadDateRangeType !== 'customRange') {
    return '';
  }

  const start = normalizeScheduledExportDate(config.downloadDateStart);
  const end = normalizeScheduledExportDate(config.downloadDateEnd);
  if (!start && !end) {
    return '自定义时间范围至少需要填写开始日期或结束日期';
  }

  if (start && end && getDateStartUnix(start) > getDateEndUnix(end)) {
    return '自定义时间范围的开始日期不能晚于结束日期';
  }

  return '';
}

export function shouldSkipScheduledContentFetch(selectedAccountFakeids: string[]) {
  if (selectedAccountFakeids.length === 0) {
    return {
      shouldSkip: true,
      summary: '未选择公众号，已跳过本轮定时抓取',
    };
  }

  return {
    shouldSkip: false,
    summary: '',
  };
}

export function buildScheduledContentFetchSummary(summary: { completed: number; failed: number; deleted: number }) {
  return `已处理 ${summary.completed + summary.failed + summary.deleted} 篇文章，成功抓取 ${summary.completed} 篇，失败 ${summary.failed} 篇，已删除 ${summary.deleted} 篇`;
}

export function normalizeWorkerSchedulerConfig(
  config: Pick<
    WorkerSchedulerConfig,
    | 'selectedAccountFakeids'
    | 'selectedExportFormats'
    | 'downloadDateRangeType'
    | 'downloadRecentDays'
    | 'downloadDateStart'
    | 'downloadDateEnd'
  >
) {
  return {
    selectedAccountFakeids: normalizeSelectedAccountFakeids(config.selectedAccountFakeids),
    selectedExportFormats: normalizeSelectedExportFormats(config.selectedExportFormats),
    downloadDateRangeType: normalizeScheduledExportDateRangeType(config.downloadDateRangeType),
    downloadRecentDays: normalizeScheduledExportRecentDays(config.downloadRecentDays),
    downloadDateStart: normalizeScheduledExportDate(config.downloadDateStart),
    downloadDateEnd: normalizeScheduledExportDate(config.downloadDateEnd),
  };
}
