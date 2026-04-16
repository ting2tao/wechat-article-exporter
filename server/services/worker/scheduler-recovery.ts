import type { WorkerSchedulerState } from '../../../types/worker-scheduler.ts';

export function getInterruptedTaskRecoveryPatch(state: WorkerSchedulerState, finishedAt = Date.now()) {
  const patch: Partial<WorkerSchedulerState> = {};

  if (state.syncRunning) {
    patch.syncRunning = false;
    patch.lastSyncFinishedAt = finishedAt;
    patch.lastSyncSummary = '';
    patch.lastSyncError = '后台任务在服务重启后被中断，请重新执行同步任务';
  }

  if (state.downloadRunning) {
    patch.downloadRunning = false;
    patch.lastDownloadFinishedAt = finishedAt;
    patch.lastDownloadSummary = '';
    patch.lastDownloadError = '后台任务在服务重启后被中断，请重新执行导出任务';
  }

  return patch;
}
