import { ensureWorkerSchedulerStarted } from '~/server/services/worker/scheduler';

export default defineNitroPlugin(() => {
  void ensureWorkerSchedulerStarted().catch(error => {
    console.error('后台调度器初始化失败:', error);
  });
});
