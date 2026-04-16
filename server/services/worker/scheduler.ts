import { sleep } from '#shared/utils/helpers';
import { buildScheduledExportSummary, shouldSkipScheduledExport } from '~/server/services/worker/config-helpers';
import { downloadPendingHtmlBatch } from '~/server/services/worker/html-downloader';
import { checkMpSessionStatus, fetchAccountArticlePage } from '~/server/services/worker/mp-client';
import { notifyWorkerStatus } from '~/server/services/worker/notifier';
import { getInterruptedTaskRecoveryPatch } from '~/server/services/worker/scheduler-recovery';
import {
  getSchedulerAuthKey,
  getSchedulerConfig,
  getSchedulerSnapshot,
  getSchedulerState,
  listTrackedAccountsByFakeids,
  updateSchedulerConfig,
  updateSchedulerState,
  upsertAccountArticles,
} from '~/server/services/worker/repository';
import type { MpAccount } from '~/store/v2/info';

const SCHEDULER_TICK_MS = 15 * 1000;
const SYNC_PAGE_SLEEP_MS = 3000;
const MP_STATUS_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MP_STATUS_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const WORKER_STATUS_ALERT_COOLDOWN_MS = 10 * 60 * 1000;

let schedulerStarted = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let activeTask: Promise<void> | null = null;
let lastMpStatusCheckAt = 0;
let lastMpSessionValid: boolean | null = null;

async function recoverInterruptedTasksIfNeeded() {
  if (activeTask) {
    return;
  }

  const patch = getInterruptedTaskRecoveryPatch(await getSchedulerState());
  if (Object.keys(patch).length > 0) {
    await updateSchedulerState(patch);
  }
}

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
  await recoverInterruptedTasksIfNeeded();
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

  const config = await getSchedulerConfig();
  if (config.selectedAccountFakeids.length === 0) {
    const summary = '未选择公众号，已跳过本轮同步';
    await updateSchedulerState({
      lastSyncFinishedAt: Date.now(),
      lastSyncSummary: summary,
      lastSyncError: '',
    });
    return summary;
  }

  const accounts = await listTrackedAccountsByFakeids(config.selectedAccountFakeids);
  if (accounts.length === 0) {
    const summary = '所选公众号未托管或已被删除，已跳过本轮同步';
    await updateSchedulerState({
      lastSyncFinishedAt: Date.now(),
      lastSyncSummary: summary,
      lastSyncError: '',
    });
    return summary;
  }

  let inserted = 0;
  let updated = 0;
  for (const account of accounts) {
    const result = await syncSingleAccount(account, authKey);
    inserted += result.inserted;
    updated += result.updated;
  }

  const summary = `已同步 ${accounts.length} 个公众号，新增 ${inserted} 篇文章，更新 ${updated} 篇文章`;
  await updateSchedulerState({
    lastSyncFinishedAt: Date.now(),
    lastSyncSummary: summary,
    lastSyncError: '',
  });

  return summary;
}

async function runDownloadTaskInternal() {
  const config = await getSchedulerConfig();

  const decision = shouldSkipScheduledExport(config.selectedAccountFakeids, config.selectedExportFormats);
  if (decision.shouldSkip) {
    await updateSchedulerState({
      lastDownloadFinishedAt: Date.now(),
      lastDownloadSummary: decision.summary,
      lastDownloadError: '',
    });
    return decision.summary;
  }

  const summary = await downloadPendingHtmlBatch(
    config.downloadBatchSize,
    config.selectedAccountFakeids,
    config.selectedExportFormats,
    {
      downloadDateRangeType: config.downloadDateRangeType,
      downloadRecentDays: config.downloadRecentDays,
      downloadDateStart: config.downloadDateStart,
      downloadDateEnd: config.downloadDateEnd,
    }
  );
  const summaryText =
    summary.completed + summary.failed + summary.deleted === 0
      ? '当前没有待导出的文章，已跳过本轮定时导出'
      : buildScheduledExportSummary(summary);
  await updateSchedulerState({
    lastDownloadFinishedAt: Date.now(),
    lastDownloadSummary: summaryText,
    lastDownloadError: '',
  });

  return summaryText;
}

async function checkMpStatusIfNeeded(config: Awaited<ReturnType<typeof getSchedulerConfig>>) {
  if (!config.syncEnabled) {
    return;
  }

  const now = Date.now();
  if (now - lastMpStatusCheckAt < MP_STATUS_CHECK_INTERVAL_MS) {
    return;
  }

  lastMpStatusCheckAt = now;

  const authKey = await getSchedulerAuthKey();
  if (!authKey) {
    lastMpSessionValid = false;
    await notifyWorkerStatus({
      title: '公众号状态告警',
      lines: ['状态: 未绑定后台任务登录态', '说明: 请重新扫码登录公众号后台，并在设置页保存一次任务配置'],
      dedupeKey: 'mp-auth-missing',
      cooldownMs: MP_STATUS_ALERT_COOLDOWN_MS,
    });
    return;
  }

  try {
    const status = await checkMpSessionStatus(authKey);
    if (status.valid) {
      if (lastMpSessionValid === false) {
        await notifyWorkerStatus({
          title: '公众号状态恢复',
          lines: [`状态: 已恢复正常`, `公众号: ${status.nickname || '--'}`],
          dedupeKey: 'mp-auth-restored',
          cooldownMs: 60 * 1000,
        });
      }

      lastMpSessionValid = true;
      return;
    }

    lastMpSessionValid = false;
    await notifyWorkerStatus({
      title: '公众号状态告警',
      lines: ['状态: 登录态疑似失效', `详情: ${status.reason || '请重新扫码登录公众号后台'}`],
      dedupeKey: 'mp-auth-invalid',
      cooldownMs: MP_STATUS_ALERT_COOLDOWN_MS,
    });
  } catch (error) {
    await notifyWorkerStatus({
      title: '公众号状态检查失败',
      lines: [`详情: ${error instanceof Error ? error.message : String(error)}`],
      dedupeKey: 'mp-status-check-failed',
      cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
    });
  }
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
      const summary = await runSyncTaskInternal();
      await notifyWorkerStatus({
        title: '后台任务通知',
        lines: [`任务: 公众号同步`, `结果: ${summary}`],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSchedulerState({
        lastSyncFinishedAt: Date.now(),
        lastSyncSummary: '',
        lastSyncError: message,
      });
      await notifyWorkerStatus({
        title: '后台任务告警',
        lines: [`任务: 公众号同步`, `结果: 失败`, `详情: ${message}`],
        dedupeKey: `worker-sync-error:${message}`,
        cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
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
    const summary = await runDownloadTaskInternal();
    await notifyWorkerStatus({
      title: '后台任务通知',
      lines: [`任务: 定时导出`, `结果: ${summary}`],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateSchedulerState({
      lastDownloadFinishedAt: Date.now(),
      lastDownloadSummary: '',
      lastDownloadError: message,
    });
    await notifyWorkerStatus({
      title: '后台任务告警',
      lines: [`任务: 定时导出`, `结果: 失败`, `详情: ${message}`],
      dedupeKey: `worker-download-error:${message}`,
      cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
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

  await checkMpStatusIfNeeded(config);

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
  await recoverInterruptedTasksIfNeeded();

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
  await recoverInterruptedTasksIfNeeded();
  await refreshWorkerSchedule();
  schedulerTimer = setInterval(() => {
    void tick().catch(error => {
      console.error('后台调度器 tick 失败:', error);
      void notifyWorkerStatus({
        title: '后台任务告警',
        lines: [`任务: 调度器 tick`, `结果: 失败`, `详情: ${error instanceof Error ? error.message : String(error)}`],
        dedupeKey: 'worker-scheduler-tick-failed',
        cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
      });
    });
  }, SCHEDULER_TICK_MS);

  void tick().catch(error => {
    console.error('后台调度器启动失败:', error);
    void notifyWorkerStatus({
      title: '后台任务告警',
      lines: [`任务: 调度器启动`, `结果: 失败`, `详情: ${error instanceof Error ? error.message : String(error)}`],
      dedupeKey: 'worker-scheduler-start-failed',
      cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
    });
  });
}

export async function getWorkerSchedulerSnapshot() {
  await recoverInterruptedTasksIfNeeded();
  return getSchedulerSnapshot();
}
