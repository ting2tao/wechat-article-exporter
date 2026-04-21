import { getWorkerSchedulerSnapshot } from '~/server/services/worker/scheduler';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  return getWorkerSchedulerSnapshot(getAuthKeyFromRequest(event));
});
