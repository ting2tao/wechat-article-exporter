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
  }>(event);

  const current = await getSchedulerConfig();
  const wantsEnable =
    Boolean(body.syncEnabled ?? current.syncEnabled) || Boolean(body.downloadEnabled ?? current.downloadEnabled);
  const authKey = getAuthKeyFromRequest(event);

  if (wantsEnable && !authKey && !current.authBound) {
    throw createError({
      statusCode: 400,
      statusMessage: '启用后台任务前，请先扫码登录公众号后台',
    });
  }

  await updateSchedulerConfig({
    syncEnabled: body.syncEnabled ?? current.syncEnabled,
    syncIntervalMinutes: Math.max(1, Number(body.syncIntervalMinutes) || current.syncIntervalMinutes),
    downloadEnabled: body.downloadEnabled ?? current.downloadEnabled,
    downloadIntervalMinutes: Math.max(1, Number(body.downloadIntervalMinutes) || current.downloadIntervalMinutes),
    downloadBatchSize: Math.max(1, Number(body.downloadBatchSize) || current.downloadBatchSize),
    authKey: authKey || undefined,
    authBoundAt: authKey ? Date.now() : undefined,
  });
  await refreshWorkerSchedule();

  return getSchedulerSnapshot();
});
