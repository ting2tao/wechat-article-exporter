import { request } from '#shared/utils/request';
import type { MpAccount } from '~/store/v2/info';
import type { AppMsgExWithFakeID } from '~/types/types';
import type { WorkerSchedulerSnapshot } from '~/types/worker-scheduler';

export type WorkerTrackedArticle = AppMsgExWithFakeID & {
  html_downloaded?: boolean;
  html_updated_at?: number | null;
};

export interface WorkerArticleHtmlPayload {
  fakeid: string;
  aid: string;
  link: string;
  title: string;
  html: string;
  htmlUpdatedAt: number | null;
}

export async function getWorkerSchedulerSnapshot() {
  return request<WorkerSchedulerSnapshot>('/api/web/worker/scheduler');
}

export async function saveWorkerSchedulerConfig(payload: {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  downloadEnabled: boolean;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  downloadDateRangeType: 'all' | 'recentDays' | 'customRange';
  downloadRecentDays: number;
  downloadDateStart: string;
  downloadDateEnd: string;
  alertWebhookUrl: string;
  selectedAccountFakeids: string[];
  selectedExportFormats: Array<'html' | 'txt' | 'markdown'>;
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

export async function getWorkerAccounts() {
  return request<MpAccount[]>('/api/web/worker/accounts');
}

export async function getWorkerArticles(fakeid: string) {
  return request<WorkerTrackedArticle[]>('/api/web/worker/articles', {
    query: {
      fakeid,
    },
  });
}

export async function getWorkerArticleHtmlBatch(fakeid: string, aids: string[]) {
  return request<WorkerArticleHtmlPayload[]>('/api/web/worker/article-html', {
    method: 'POST',
    body: {
      fakeid,
      aids,
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
