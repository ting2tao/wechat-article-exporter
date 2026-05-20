import { getWorkerSchedulerSnapshot } from '~/server/services/worker/scheduler';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  return getWorkerSchedulerSnapshot(await resolveScopeIdFromRequest(event));
});
