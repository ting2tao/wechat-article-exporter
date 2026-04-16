import {
  normalizeWorkerSchedulerConfig,
  validateSchedulerConfigSelection,
} from '~/server/services/worker/config-helpers';
import { getSchedulerConfig, getSchedulerSnapshot, updateSchedulerConfig } from '~/server/services/worker/repository';
import { refreshWorkerSchedule } from '~/server/services/worker/scheduler';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  const body = await readBody<{
    syncEnabled?: boolean;
    syncIntervalMinutes?: number;
    downloadEnabled?: boolean;
    downloadIntervalMinutes?: number;
    downloadBatchSize?: number;
    downloadDateRangeType?: 'all' | 'recentDays' | 'customRange';
    downloadRecentDays?: number;
    downloadDateStart?: string;
    downloadDateEnd?: string;
    alertWebhookUrl?: string;
    selectedAccountFakeids?: string[];
    selectedExportFormats?: Array<'html' | 'txt' | 'markdown'>;
  }>(event);

  const current = await getSchedulerConfig();
  const wantsEnable =
    Boolean(body.syncEnabled ?? current.syncEnabled) || Boolean(body.downloadEnabled ?? current.downloadEnabled);
  const authKey = getAuthKeyFromRequest(event);

  if (wantsEnable && !authKey && !current.authBound) {
    throw createError({
      statusCode: 400,
      statusMessage: '后台任务配置无效',
      message: '启用后台任务前，请先扫码登录公众号后台',
    });
  }

  const nextSelection = normalizeWorkerSchedulerConfig({
    selectedAccountFakeids: body.selectedAccountFakeids ?? current.selectedAccountFakeids,
    selectedExportFormats: body.selectedExportFormats ?? current.selectedExportFormats,
    downloadDateRangeType: body.downloadDateRangeType ?? current.downloadDateRangeType,
    downloadRecentDays: body.downloadRecentDays ?? current.downloadRecentDays,
    downloadDateStart: body.downloadDateStart ?? current.downloadDateStart,
    downloadDateEnd: body.downloadDateEnd ?? current.downloadDateEnd,
  });
  const selectionError = validateSchedulerConfigSelection({
    syncEnabled: body.syncEnabled ?? current.syncEnabled,
    downloadEnabled: body.downloadEnabled ?? current.downloadEnabled,
    ...nextSelection,
  });
  if (selectionError) {
    throw createError({
      statusCode: 400,
      statusMessage: '后台任务配置无效',
      message: selectionError,
    });
  }

  await updateSchedulerConfig({
    syncEnabled: body.syncEnabled ?? current.syncEnabled,
    syncIntervalMinutes: Math.max(1, Number(body.syncIntervalMinutes) || current.syncIntervalMinutes),
    downloadEnabled: body.downloadEnabled ?? current.downloadEnabled,
    downloadIntervalMinutes: Math.max(1, Number(body.downloadIntervalMinutes) || current.downloadIntervalMinutes),
    downloadBatchSize: Math.max(1, Number(body.downloadBatchSize) || current.downloadBatchSize),
    downloadDateRangeType: nextSelection.downloadDateRangeType,
    downloadRecentDays: nextSelection.downloadRecentDays,
    downloadDateStart: nextSelection.downloadDateStart,
    downloadDateEnd: nextSelection.downloadDateEnd,
    alertWebhookUrl: body.alertWebhookUrl?.trim() ?? current.alertWebhookUrl,
    selectedAccountFakeids: nextSelection.selectedAccountFakeids,
    selectedExportFormats: nextSelection.selectedExportFormats,
    authKey: authKey || undefined,
    authBoundAt: authKey ? Date.now() : undefined,
  });
  await refreshWorkerSchedule();

  return getSchedulerSnapshot();
});
