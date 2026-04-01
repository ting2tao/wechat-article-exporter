import { request } from '#shared/utils/request';
import type { MpAccount } from '~/store/v2/info';
import type { WorkerSchedulerSnapshot } from '~/types/worker-scheduler';

export async function getWorkerSchedulerSnapshot() {
  return request<WorkerSchedulerSnapshot>('/api/web/worker/scheduler');
}

export async function saveWorkerSchedulerConfig(payload: {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  downloadEnabled: boolean;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
}) {
  return request<WorkerSchedulerSnapshot>('/api/web/worker/scheduler', {
    method: 'POST',
    body: payload,
  });
}

export async function runWorkerTask(task: 'sync' | 'download') {
  return request<{ started: boolean; snapshot: WorkerSchedulerSnapshot }>('/api/web/worker/scheduler-run', {
    method: 'POST',
    body: {
      task,
    },
  });
}

export async function upsertWorkerAccounts(accounts: MpAccount[]) {
  return request<{ ok: true }>('/api/web/worker/accounts', {
    method: 'POST',
    body: {
      accounts,
    },
  });
}

export async function deleteWorkerAccounts(fakeids: string[]) {
  return request<{ ok: true }>('/api/web/worker/accounts-delete', {
    method: 'POST',
    body: {
      fakeids,
    },
  });
}
