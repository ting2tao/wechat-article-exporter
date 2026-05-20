import { getSchedulerSnapshot } from '~/server/services/worker/repository';
import { queueWorkerTask } from '~/server/services/worker/scheduler';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const body = await readBody<{ task?: 'sync' | 'download' }>(event);
  if (body.task !== 'sync' && body.task !== 'download') {
    throw createError({
      statusCode: 400,
      statusMessage: '不支持的任务类型',
    });
  }

  const authKey = getAuthKeyFromRequest(event);
  const scopeId = await resolveScopeIdFromRequest(event);
  const started = await queueWorkerTask(body.task, authKey, scopeId);
  return {
    started,
    snapshot: await getSchedulerSnapshot(scopeId),
  };
});
