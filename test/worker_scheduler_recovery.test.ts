import assert from 'node:assert/strict';
import test from 'node:test';

const schedulerRecovery = await import(
  new URL('../server/services/worker/scheduler-recovery.ts', import.meta.url).href
);

test('getInterruptedTaskRecoveryPatch clears stale sync state after restart', () => {
  const now = 1_776_300_000_000;
  const patch = schedulerRecovery.getInterruptedTaskRecoveryPatch(
    {
      syncRunning: true,
      downloadRunning: false,
      lastSyncStartedAt: now - 60_000,
      lastSyncFinishedAt: null,
      lastSyncSummary: '',
      lastSyncError: '',
      nextSyncAt: now + 60_000,
      lastDownloadStartedAt: null,
      lastDownloadFinishedAt: null,
      lastDownloadSummary: '',
      lastDownloadError: '',
      nextDownloadAt: null,
    },
    now
  );

  assert.deepEqual(patch, {
    syncRunning: false,
    lastSyncFinishedAt: now,
    lastSyncSummary: '',
    lastSyncError: '后台任务在服务重启后被中断，请重新执行同步任务',
  });
});

test('getInterruptedTaskRecoveryPatch clears stale download state after restart', () => {
  const now = 1_776_300_000_000;
  const patch = schedulerRecovery.getInterruptedTaskRecoveryPatch(
    {
      syncRunning: false,
      downloadRunning: true,
      lastSyncStartedAt: null,
      lastSyncFinishedAt: null,
      lastSyncSummary: '',
      lastSyncError: '',
      nextSyncAt: null,
      lastDownloadStartedAt: now - 30_000,
      lastDownloadFinishedAt: null,
      lastDownloadSummary: '',
      lastDownloadError: '',
      nextDownloadAt: now + 60_000,
    },
    now
  );

  assert.deepEqual(patch, {
    downloadRunning: false,
    lastDownloadFinishedAt: now,
    lastDownloadSummary: '',
    lastDownloadError: '后台任务在服务重启后被中断，请重新执行文章抓取任务',
  });
});
