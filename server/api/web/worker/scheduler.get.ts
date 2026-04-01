import { getWorkerSchedulerSnapshot } from '~/server/services/worker/scheduler';

export default defineEventHandler(async () => {
  return getWorkerSchedulerSnapshot();
});
