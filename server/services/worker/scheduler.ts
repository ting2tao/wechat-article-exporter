import { sleep } from '#shared/utils/helpers';
import {
  buildScheduledContentFetchSummary,
  shouldSkipScheduledContentFetch,
} from '~/server/services/worker/config-helpers';
import { downloadPendingHtmlBatch } from '~/server/services/worker/html-downloader';
import { checkMpSessionStatus, fetchAccountArticlePage } from '~/server/services/worker/mp-client';
import { notifyWorkerStatus } from '~/server/services/worker/notifier';
import {
  getSchedulerAuthKey,
  getSchedulerConfig,
  getSchedulerSnapshot,
  getSchedulerState,
  listSchedulerScopeIds,
  listTrackedAccountsByFakeids,
  updateSchedulerConfig,
  updateSchedulerState,
  upsertAccountArticles,
} from '~/server/services/worker/repository';
import { getInterruptedTaskRecoveryPatch } from '~/server/services/worker/scheduler-recovery';
import type { MpAccount } from '~/store/v2/info';

const SCHEDULER_TICK_MS = 15 * 1000;
const SYNC_PAGE_SLEEP_MS = 3000;
const MP_STATUS_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MP_STATUS_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const WORKER_STATUS_ALERT_COOLDOWN_MS = 10 * 60 * 1000;

let schedulerStarted = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let activeTask: Promise<void> | null = null;
const lastMpStatusCheckAt = new Map<string, number>();
const lastMpSessionValid = new Map<string, boolean | null>();

async function getKnownScopeIds(scopeId?: string | null) {
  if (scopeId) {
    return [scopeId];
  }

  return listSchedulerScopeIds();
}

async function recoverInterruptedTasksIfNeeded(scopeId?: string | null) {
  if (activeTask && scopeId == null) {
    return;
  }

  for (const currentScopeId of await getKnownScopeIds(scopeId)) {
    const patch = getInterruptedTaskRecoveryPatch(await getSchedulerState(currentScopeId));
    if (Object.keys(patch).length > 0) {
      await updateSchedulerState(patch, currentScopeId);
    }
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

export async function refreshWorkerSchedule(scopeId?: string | null) {
  await recoverInterruptedTasksIfNeeded(scopeId);

  for (const currentScopeId of await getKnownScopeIds(scopeId)) {
    const [config, state] = await Promise.all([getSchedulerConfig(currentScopeId), getSchedulerState(currentScopeId)]);
    await updateSchedulerState(
      {
        nextSyncAt: getNextRunAt(
          config.syncEnabled,
          config.syncIntervalMinutes,
          state.lastSyncStartedAt,
          state.nextSyncAt
        ),
        nextDownloadAt: getNextRunAt(
          config.downloadEnabled,
          config.downloadIntervalMinutes,
          state.lastDownloadStartedAt,
          state.nextDownloadAt
        ),
      },
      currentScopeId
    );
  }
}

async function syncSingleAccount(account: MpAccount, authKey: string, scopeId: string) {
  let begin = 0;
  let inserted = 0;
  let updated = 0;
  const lastKnownTimestamp = account.last_update_time || 0;

  while (true) {
    const page = await fetchAccountArticlePage(account, authKey, begin);
    if (page.completed || page.articles.length === 0) {
      break;
    }

    const result = await upsertAccountArticles(account, page.totalCount, page.articles, scopeId);
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

async function runSyncTaskInternal(scopeId: string) {
  const authKey = await getSchedulerAuthKey(scopeId);
  if (!authKey) {
    throw new Error('后台任务还没有绑定登录态，请登录后在设置页保存任务配置');
  }

  const config = await getSchedulerConfig(scopeId);
  if (config.selectedAccountFakeids.length === 0) {
    const summary = '未选择公众号，已跳过本轮同步';
    await updateSchedulerState(
      {
        lastSyncFinishedAt: Date.now(),
        lastSyncSummary: summary,
        lastSyncError: '',
      },
      scopeId
    );
    return summary;
  }

  const accounts = await listTrackedAccountsByFakeids(config.selectedAccountFakeids, scopeId);
  if (accounts.length === 0) {
    const summary = '所选公众号未托管或已被删除，已跳过本轮同步';
    await updateSchedulerState(
      {
        lastSyncFinishedAt: Date.now(),
        lastSyncSummary: summary,
        lastSyncError: '',
      },
      scopeId
    );
    return summary;
  }

  let inserted = 0;
  let updated = 0;
  for (const account of accounts) {
    const result = await syncSingleAccount(account, authKey, scopeId);
    inserted += result.inserted;
    updated += result.updated;
  }

  const summary = `已同步 ${accounts.length} 个公众号，新增 ${inserted} 篇文章，更新 ${updated} 篇文章`;
  await updateSchedulerState(
    {
      lastSyncFinishedAt: Date.now(),
      lastSyncSummary: summary,
      lastSyncError: '',
    },
    scopeId
  );

  return summary;
}

async function runDownloadTaskInternal(scopeId: string) {
  const config = await getSchedulerConfig(scopeId);

  const decision = shouldSkipScheduledContentFetch(config.selectedAccountFakeids);
  if (decision.shouldSkip) {
    await updateSchedulerState(
      {
        lastDownloadFinishedAt: Date.now(),
        lastDownloadSummary: decision.summary,
        lastDownloadError: '',
      },
      scopeId
    );
    return decision.summary;
  }

  const summary = await downloadPendingHtmlBatch(config.downloadBatchSize, config.selectedAccountFakeids, scopeId, {
    downloadDateRangeType: config.downloadDateRangeType,
    downloadRecentDays: config.downloadRecentDays,
    downloadDateStart: config.downloadDateStart,
    downloadDateEnd: config.downloadDateEnd,
  });
  const summaryText =
    summary.completed + summary.failed + summary.deleted === 0
      ? '当前没有待抓取的文章，已跳过本轮定时抓取'
      : buildScheduledContentFetchSummary(summary);
  await updateSchedulerState(
    {
      lastDownloadFinishedAt: Date.now(),
      lastDownloadSummary: summaryText,
      lastDownloadError: '',
    },
    scopeId
  );

  return summaryText;
}

async function checkMpStatusIfNeeded(scopeId: string, config: Awaited<ReturnType<typeof getSchedulerConfig>>) {
  if (!config.syncEnabled) {
    return;
  }

  const now = Date.now();
  if (now - (lastMpStatusCheckAt.get(scopeId) || 0) < MP_STATUS_CHECK_INTERVAL_MS) {
    return;
  }

  lastMpStatusCheckAt.set(scopeId, now);

  const authKey = await getSchedulerAuthKey(scopeId);
  if (!authKey) {
    lastMpSessionValid.set(scopeId, false);
    await notifyWorkerStatus({
      title: '公众号状态告警',
      lines: ['状态: 未绑定后台任务登录态', '说明: 请重新扫码登录公众号后台，并在设置页保存一次任务配置'],
      dedupeKey: 'mp-auth-missing',
      cooldownMs: MP_STATUS_ALERT_COOLDOWN_MS,
      scopeId,
    });
    return;
  }

  try {
    const status = await checkMpSessionStatus(authKey);
    if (status.valid) {
      if (lastMpSessionValid.get(scopeId) === false) {
        await notifyWorkerStatus({
          title: '公众号状态恢复',
          lines: [`状态: 已恢复正常`, `公众号: ${status.nickname || '--'}`],
          dedupeKey: 'mp-auth-restored',
          cooldownMs: 60 * 1000,
          scopeId,
        });
      }

      lastMpSessionValid.set(scopeId, true);
      return;
    }

    lastMpSessionValid.set(scopeId, false);
    await notifyWorkerStatus({
      title: '公众号状态告警',
      lines: ['状态: 登录态疑似失效', `详情: ${status.reason || '请重新扫码登录公众号后台'}`],
      dedupeKey: 'mp-auth-invalid',
      cooldownMs: MP_STATUS_ALERT_COOLDOWN_MS,
      scopeId,
    });
  } catch (error) {
    await notifyWorkerStatus({
      title: '公众号状态检查失败',
      lines: [`详情: ${error instanceof Error ? error.message : String(error)}`],
      dedupeKey: 'mp-status-check-failed',
      cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
      scopeId,
    });
  }
}

async function runTask(scopeId: string, task: 'sync' | 'download') {
  const config = await getSchedulerConfig(scopeId);
  const state = await getSchedulerState(scopeId);
  if (task === 'sync') {
    await updateSchedulerState(
      {
        syncRunning: true,
        lastSyncStartedAt: Date.now(),
        lastSyncError: '',
        nextSyncAt: getNextRunAt(config.syncEnabled, config.syncIntervalMinutes, Date.now(), state.nextSyncAt),
      },
      scopeId
    );
    try {
      const summary = await runSyncTaskInternal(scopeId);
      await notifyWorkerStatus({
        title: '后台任务通知',
        lines: [`任务: 公众号同步`, `结果: ${summary}`],
        scopeId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSchedulerState(
        {
          lastSyncFinishedAt: Date.now(),
          lastSyncSummary: '',
          lastSyncError: message,
        },
        scopeId
      );
      await notifyWorkerStatus({
        title: '后台任务告警',
        lines: [`任务: 公众号同步`, `结果: 失败`, `详情: ${message}`],
        dedupeKey: `worker-sync-error:${message}`,
        cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
        scopeId,
      });
    } finally {
      await updateSchedulerState({ syncRunning: false }, scopeId);
      await refreshWorkerSchedule(scopeId);
    }
    return;
  }

  await updateSchedulerState(
    {
      downloadRunning: true,
      lastDownloadStartedAt: Date.now(),
      lastDownloadError: '',
      nextDownloadAt: getNextRunAt(
        config.downloadEnabled,
        config.downloadIntervalMinutes,
        Date.now(),
        state.nextDownloadAt
      ),
    },
    scopeId
  );
  try {
    const summary = await runDownloadTaskInternal(scopeId);
    await notifyWorkerStatus({
      title: '后台任务通知',
      lines: [`任务: 定时抓取文章内容`, `结果: ${summary}`],
      scopeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateSchedulerState(
      {
        lastDownloadFinishedAt: Date.now(),
        lastDownloadSummary: '',
        lastDownloadError: message,
      },
      scopeId
    );
    await notifyWorkerStatus({
      title: '后台任务告警',
      lines: [`任务: 定时抓取文章内容`, `结果: 失败`, `详情: ${message}`],
      dedupeKey: `worker-content-fetch-error:${message}`,
      cooldownMs: WORKER_STATUS_ALERT_COOLDOWN_MS,
      scopeId,
    });
  } finally {
    await updateSchedulerState({ downloadRunning: false }, scopeId);
    await refreshWorkerSchedule(scopeId);
  }
}

async function tick() {
  if (activeTask) {
    return;
  }

  const now = Date.now();
  for (const scopeId of await listSchedulerScopeIds()) {
    const [config, state] = await Promise.all([getSchedulerConfig(scopeId), getSchedulerState(scopeId)]);
    await checkMpStatusIfNeeded(scopeId, config);

    const shouldRunSync = config.syncEnabled && !state.syncRunning && !!state.nextSyncAt && state.nextSyncAt <= now;
    const shouldRunDownload =
      config.downloadEnabled && !state.downloadRunning && !!state.nextDownloadAt && state.nextDownloadAt <= now;

    if (!shouldRunSync && !shouldRunDownload) {
      continue;
    }

    const task: 'sync' | 'download' = shouldRunSync ? 'sync' : 'download';
    activeTask = runTask(scopeId, task).finally(() => {
      activeTask = null;
    });
    await activeTask;
    return;
  }
}

export async function queueWorkerTask(task: 'sync' | 'download', authKey?: string | null, scopeId?: string | null) {
  await recoverInterruptedTasksIfNeeded(scopeId);
  if (!authKey) {
    return false;
  }

  const resolvedScopeId = scopeId || authKey;
  await updateSchedulerConfig(
    {
      authKey,
      authBoundAt: Date.now(),
    },
    resolvedScopeId
  );

  if (activeTask) {
    return false;
  }

  activeTask = runTask(resolvedScopeId, task).finally(() => {
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

export async function getWorkerSchedulerSnapshot(scopeId?: string | null) {
  await recoverInterruptedTasksIfNeeded(scopeId);
  return getSchedulerSnapshot(scopeId);
}
