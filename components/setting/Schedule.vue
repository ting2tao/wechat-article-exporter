<template>
  <UCard class="mx-4 mt-10 flex-1">
    <template #header>
      <h3 class="text-2xl font-semibold">后台定时任务</h3>
      <p class="text-sm text-slate-10 font-serif">运行在 ECS 服务端，浏览器关闭后任务仍会按计划继续执行</p>
    </template>

    <div class="space-y-6">
      <UAlert color="sky" variant="soft" title="当前能力">
        <template #description>
          当前已支持服务端定时同步公众号文章列表，并自动下载未抓取的文章 HTML。
        </template>
      </UAlert>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="rounded-lg border border-slate-200 p-4 space-y-2">
          <p class="text-sm text-slate-500">托管公众号</p>
          <p class="text-3xl font-semibold">{{ snapshot?.stats.trackedAccounts ?? 0 }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4 space-y-2">
          <p class="text-sm text-slate-500">服务端文章数</p>
          <p class="text-3xl font-semibold">{{ snapshot?.stats.trackedArticles ?? 0 }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4 space-y-2">
          <p class="text-sm text-slate-500">已下载 HTML</p>
          <p class="text-3xl font-semibold">{{ snapshot?.stats.downloadedHtmlArticles ?? 0 }}</p>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 p-4 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-lg font-medium">公众号同步</p>
            <p class="text-sm text-slate-500">首次会全量同步历史文章，后续按增量周期同步</p>
          </div>
          <UCheckbox v-model="form.syncEnabled" label="启用" />
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <UInput v-model="form.syncIntervalMinutes" type="number" min="1" class="w-40 font-mono" placeholder="同步间隔">
            <template #trailing>
              <span class="text-xs text-gray-500">分钟</span>
            </template>
          </UInput>
          <UButton color="blue" :loading="isSaving" @click="saveConfig">保存配置</UButton>
          <UButton
            color="gray"
            :loading="snapshot?.state.syncRunning"
            :disabled="snapshot?.state.downloadRunning"
            @click="runTask('sync')"
          >
            立即同步
          </UButton>
        </div>

        <div class="text-sm space-y-1 text-slate-600">
          <p>登录态绑定: {{ snapshot?.config.authBound ? '已绑定' : '未绑定' }}</p>
          <p>绑定时间: {{ formatTimestamp(snapshot?.config.authBoundAt ?? null) }}</p>
          <p>上次开始: {{ formatTimestamp(snapshot?.state.lastSyncStartedAt ?? null) }}</p>
          <p>上次完成: {{ formatTimestamp(snapshot?.state.lastSyncFinishedAt ?? null) }}</p>
          <p>下次计划: {{ formatTimestamp(snapshot?.state.nextSyncAt ?? null) }}</p>
          <p v-if="snapshot?.state.lastSyncSummary" class="text-sky-600">最近结果: {{ snapshot.state.lastSyncSummary }}</p>
          <p v-if="snapshot?.state.lastSyncError" class="text-rose-600">最近错误: {{ snapshot.state.lastSyncError }}</p>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 p-4 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-lg font-medium">HTML 下载</p>
            <p class="text-sm text-slate-500">按批次补齐服务端尚未下载的文章 HTML 内容</p>
          </div>
          <UCheckbox v-model="form.downloadEnabled" label="启用" />
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <UInput
            v-model="form.downloadIntervalMinutes"
            type="number"
            min="1"
            class="w-40 font-mono"
            placeholder="抓取间隔"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">分钟</span>
            </template>
          </UInput>
          <UInput v-model="form.downloadBatchSize" type="number" min="1" class="w-44 font-mono" placeholder="每轮抓取上限">
            <template #trailing>
              <span class="text-xs text-gray-500">篇</span>
            </template>
          </UInput>
          <UButton color="blue" :loading="isSaving" @click="saveConfig">保存配置</UButton>
          <UButton
            color="gray"
            :loading="snapshot?.state.downloadRunning"
            :disabled="snapshot?.state.syncRunning"
            @click="runTask('download')"
          >
            立即抓取
          </UButton>
        </div>

        <div class="text-sm space-y-1 text-slate-600">
          <p>上次开始: {{ formatTimestamp(snapshot?.state.lastDownloadStartedAt ?? null) }}</p>
          <p>上次完成: {{ formatTimestamp(snapshot?.state.lastDownloadFinishedAt ?? null) }}</p>
          <p>下次计划: {{ formatTimestamp(snapshot?.state.nextDownloadAt ?? null) }}</p>
          <p v-if="snapshot?.state.lastDownloadSummary" class="text-sky-600">
            最近结果: {{ snapshot.state.lastDownloadSummary }}
          </p>
          <p v-if="snapshot?.state.lastDownloadError" class="text-rose-600">
            最近错误: {{ snapshot.state.lastDownloadError }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { getWorkerSchedulerSnapshot, runWorkerTask, saveWorkerSchedulerConfig } from '~/apis/worker';
import toastFactory from '~/composables/toast';
import type { WorkerSchedulerSnapshot } from '~/types/worker-scheduler';

const toast = toastFactory();

const snapshot = ref<WorkerSchedulerSnapshot | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const form = reactive({
  syncEnabled: false,
  syncIntervalMinutes: 60,
  downloadEnabled: false,
  downloadIntervalMinutes: 60,
  downloadBatchSize: 50,
});

let refreshTimer: number | null = null;

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return '--';
  }

  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function applySnapshot(value: WorkerSchedulerSnapshot) {
  snapshot.value = value;
  form.syncEnabled = value.config.syncEnabled;
  form.syncIntervalMinutes = value.config.syncIntervalMinutes;
  form.downloadEnabled = value.config.downloadEnabled;
  form.downloadIntervalMinutes = value.config.downloadIntervalMinutes;
  form.downloadBatchSize = value.config.downloadBatchSize;
}

async function refreshSnapshot(showError = false) {
  try {
    isLoading.value = true;
    applySnapshot(await getWorkerSchedulerSnapshot());
  } catch (error) {
    if (showError) {
      toast.error('读取后台任务失败', error instanceof Error ? error.message : String(error));
    }
  } finally {
    isLoading.value = false;
  }
}

async function saveConfig() {
  try {
    isSaving.value = true;
    form.syncIntervalMinutes = Math.max(1, Number(form.syncIntervalMinutes) || 1);
    form.downloadIntervalMinutes = Math.max(1, Number(form.downloadIntervalMinutes) || 1);
    form.downloadBatchSize = Math.max(1, Number(form.downloadBatchSize) || 1);
    const next = await saveWorkerSchedulerConfig({
      syncEnabled: form.syncEnabled,
      syncIntervalMinutes: form.syncIntervalMinutes,
      downloadEnabled: form.downloadEnabled,
      downloadIntervalMinutes: form.downloadIntervalMinutes,
      downloadBatchSize: form.downloadBatchSize,
    });
    applySnapshot(next);
    toast.success('后台任务配置已保存');
  } catch (error) {
    toast.error('保存后台任务失败', error instanceof Error ? error.message : String(error));
  } finally {
    isSaving.value = false;
  }
}

async function runTask(task: 'sync' | 'download') {
  try {
    const result = await runWorkerTask(task);
    applySnapshot(result.snapshot);
    toast.success(result.started ? '后台任务已启动' : '后台任务正在运行中');
  } catch (error) {
    toast.error('启动后台任务失败', error instanceof Error ? error.message : String(error));
  }
}

onMounted(async () => {
  await refreshSnapshot(true);
  refreshTimer = window.setInterval(() => {
    void refreshSnapshot();
  }, 15000);
});

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>
