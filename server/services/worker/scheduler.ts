import { sleep } from '#shared/utils/helpers';
import { downloadPendingHtmlBatch } from '~/server/services/worker/html-downloader';
import { fetchAccountArticlePage } from '~/server/services/worker/mp-client';
import {
  getSchedulerAuthKey,
  getSchedulerConfig,
  getSchedulerSnapshot,
  getSchedulerState,
  listTrackedAccounts,
  updateSchedulerConfig,
  updateSchedulerState,
  upsertAccountArticles,
} from '~/server/services/worker/repository';
import type { MpAccount } from '~/store/v2/info';

const SCHEDULER_TICK_MS = 15 * 1000;
const SYNC_PAGE_SLEEP_MS = 3000;

let schedulerStarted = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let activeTask: Promise<void> | null = null;

function getNextRunAt(
  enabled: boolean,
  intervalMinutes: number,
  lastStartedAt: number | null,
  currentNextAt: number | null
) {
  if (!enabled) {
    return null;
  }

  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  if (lastStartedAt) {
    return lastStartedAt + intervalMs;
  }
  if (currentNextAt) {
    return currentNextAt;
  }
  return Date.now() + intervalMs;
}

export async function refreshWorkerSchedule() {
  const [config, state] = await Promise.all([getSchedulerConfig(), getSchedulerState()]);
  await updateSchedulerState({
    nextSyncAt: getNextRunAt(config.syncEnabled, config.syncIntervalMinutes, state.lastSyncStartedAt, state.nextSyncAt),
    nextDownloadAt: getNextRunAt(
      config.downloadEnabled,
      config.downloadIntervalMinutes,
      state.lastDownloadStartedAt,
      state.nextDownloadAt
    ),
  });
}

async function syncSingleAccount(account: MpAccount, authKey: string) {
  let begin = 0;
  let inserted = 0;
  let updated = 0;
  const lastKnownTimestamp = account.last_update_time || 0;

  while (true) {
    const page = await fetchAccountArticlePage(account, authKey, begin);
    if (page.completed || page.articles.length === 0) {
      break;
    }

    const result = await upsertAccountArticles(account, page.totalCount, page.articles);
    inserted += result.inserted;
    updated += result.updated;

    begin += page.articles.filter(article => article.itemidx === 1).length;
    const lastArticle = page.articles.at(-1);
    if (lastKnownTimestamp > 0 && lastArticle && lastArticle.create_time <= lastKnownTimestamp) {
      break;
    }

    await sleep(SYNC_PAGE_SLEEP_MS);
  }

  return { inserted, updated };
}

async function runSyncTaskInternal() {
  const authKey = await getSchedulerAuthKey();
  if (!authKey) {
    throw new Error('后台任务还没有绑定登录态，请登录后在设置页保存任务配置');
  }

  const accounts = await listTrackedAccounts();
  if (accounts.length === 0) {
    await updateSchedulerState({
      lastSyncFinishedAt: Date.now(),
      lastSyncSummary: '当前没有托管公众号，已跳过同步',
      lastSyncError: '',
    });
    return;
  }

  let inserted = 0;
  let updated = 0;
  for (const account of accounts) {
    const result = await syncSingleAccount(account, authKey);
    inserted += result.inserted;
    updated += result.updated;
  }

  await updateSchedulerState({
    lastSyncFinishedAt: Date.now(),
    lastSyncSummary: `已同步 ${accounts.length} 个公众号，新增 ${inserted} 篇文章，更新 ${updated} 篇文章`,
    lastSyncError: '',
  });
}

async function runDownloadTaskInternal() {
  const config = await getSchedulerConfig();
  const summary = await downloadPendingHtmlBatch(config.downloadBatchSize);
  await updateSchedulerState({
    lastDownloadFinishedAt: Date.now(),
    lastDownloadSummary: `已下载 ${summary.completed} 篇 HTML，失败 ${summary.failed} 篇，检测到已删除 ${summary.deleted} 篇`,
    lastDownloadError: '',
  });
}

async function runTask(task: 'sync' | 'download') {
  const config = await getSchedulerConfig();
  const state = await getSchedulerState();
  if (task === 'sync') {
    await updateSchedulerState({
      syncRunning: true,
      lastSyncStartedAt: Date.now(),
      lastSyncError: '',
      nextSyncAt: getNextRunAt(config.syncEnabled, config.syncIntervalMinutes, Date.now(), state.nextSyncAt),
    });
    try {
      await runSyncTaskInternal();
    } catch (error) {
      await updateSchedulerState({
        lastSyncFinishedAt: Date.now(),
        lastSyncSummary: '',
        lastSyncError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await updateSchedulerState({ syncRunning: false });
      await refreshWorkerSchedule();
    }
    return;
  }

  await updateSchedulerState({
    downloadRunning: true,
    lastDownloadStartedAt: Date.now(),
    lastDownloadError: '',
    nextDownloadAt: getNextRunAt(
      config.downloadEnabled,
      config.downloadIntervalMinutes,
      Date.now(),
      state.nextDownloadAt
    ),
  });
  try {
    await runDownloadTaskInternal();
  } catch (error) {
    await updateSchedulerState({
      lastDownloadFinishedAt: Date.now(),
      lastDownloadSummary: '',
      lastDownloadError: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await updateSchedulerState({ downloadRunning: false });
    await refreshWorkerSchedule();
  }
}

async function tick() {
  if (activeTask) {
    return;
  }

  const [config, state] = await Promise.all([getSchedulerConfig(), getSchedulerState()]);
  const now = Date.now();

  const shouldRunSync = config.syncEnabled && !state.syncRunning && !!state.nextSyncAt && state.nextSyncAt <= now;
  const shouldRunDownload =
    config.downloadEnabled && !state.downloadRunning && !!state.nextDownloadAt && state.nextDownloadAt <= now;

  if (!shouldRunSync && !shouldRunDownload) {
    return;
  }

  const task: 'sync' | 'download' = shouldRunSync ? 'sync' : 'download';
  activeTask = runTask(task).finally(() => {
    activeTask = null;
  });
  await activeTask;
}

export async function queueWorkerTask(task: 'sync' | 'download', authKey?: string | null) {
  if (authKey) {
    await updateSchedulerConfig({
      authKey,
      authBoundAt: Date.now(),
    });
  }

  if (activeTask) {
    return false;
  }

  activeTask = runTask(task).finally(() => {
    activeTask = null;
  });
  return true;
}

export async function ensureWorkerSchedulerStarted() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  await refreshWorkerSchedule();
  schedulerTimer = setInterval(() => {
    void tick().catch(error => {
      console.error('后台调度器 tick 失败:', error);
    });
  }, SCHEDULER_TICK_MS);

  void tick().catch(error => {
    console.error('后台调度器启动失败:', error);
  });
}

export async function getWorkerSchedulerSnapshot() {
  return getSchedulerSnapshot();
}
