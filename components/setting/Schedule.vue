<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Automation</p>
        <h3 class="setting-card__title">后台定时任务</h3>
        <p class="setting-card__summary">运行在 ECS 服务端，浏览器关闭后任务仍会按计划继续执行。</p>
      </div>
    </template>

    <div class="setting-card__stack">
      <UAlert color="sky" variant="soft" title="当前能力">
        <template #description>
          当前已支持服务端定时同步公众号文章列表，并自动下载未抓取的文章 HTML。配置企业微信 webhook 后，公众号登录态失效、同步结果和下载结果会自动推送告警或通知。
        </template>
      </UAlert>

      <div class="setting-card__panel">
        <div>
          <p class="setting-card__panel-title">消息通知</p>
          <p class="setting-card__panel-summary">留空则不推送。推荐填写企业微信机器人 webhook 地址。</p>
        </div>

        <UInput
          v-model="form.alertWebhookUrl"
          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
        />

        <div class="flex items-center gap-3">
          <UButton color="blue" :loading="isSaving" @click="saveConfig">保存配置</UButton>
          <span class="text-sm text-slate-500">
            当前状态: {{ snapshot?.config.alertWebhookUrl ? '已配置 webhook' : '未配置 webhook' }}
          </span>
        </div>
      </div>

      <div class="setting-card__stats">
        <div class="setting-card__stat">
          <p class="setting-card__stat-label">托管公众号</p>
          <p class="setting-card__stat-value">{{ snapshot?.stats.trackedAccounts ?? 0 }}</p>
        </div>
        <div class="setting-card__stat">
          <p class="setting-card__stat-label">服务端文章数</p>
          <p class="setting-card__stat-value">{{ snapshot?.stats.trackedArticles ?? 0 }}</p>
        </div>
        <div class="setting-card__stat">
          <p class="setting-card__stat-label">已下载 HTML</p>
          <p class="setting-card__stat-value">{{ snapshot?.stats.downloadedHtmlArticles ?? 0 }}</p>
        </div>
      </div>

      <div class="setting-card__panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="setting-card__panel-title">公众号同步</p>
            <p class="setting-card__panel-summary">首次会全量同步历史文章，后续按增量周期同步。</p>
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

      <div class="setting-card__panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="setting-card__panel-title">HTML 下载</p>
            <p class="setting-card__panel-summary">按批次补齐服务端尚未下载的文章 HTML 内容。</p>
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
  alertWebhookUrl: '',
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
  form.alertWebhookUrl = value.config.alertWebhookUrl;
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
      alertWebhookUrl: form.alertWebhookUrl.trim(),
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

<style scoped>
.setting-card {
  margin: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.setting-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.setting-card__eyebrow {
  color: rgba(15, 23, 42, 0.44);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__title {
  color: #111111;
  font-size: 1.2rem;
  font-weight: 700;
}

.setting-card__summary {
  color: rgba(15, 23, 42, 0.66);
  font-size: 0.92rem;
  line-height: 1.65;
}

.setting-card__stack {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.setting-card__panel,
.setting-card__stat {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.25rem;
  padding: 1rem;
  background: rgba(247, 246, 241, 0.82);
}

.setting-card__panel-title {
  color: #111111;
  font-size: 1.02rem;
  font-weight: 600;
}

.setting-card__panel-summary {
  margin-top: 0.2rem;
  color: rgba(15, 23, 42, 0.56);
  font-size: 0.84rem;
  line-height: 1.6;
}

.setting-card__stats {
  display: grid;
  gap: 0.85rem;
}

.setting-card__stat-label {
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.8rem;
}

.setting-card__stat-value {
  margin-top: 0.35rem;
  color: #111111;
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

@media (min-width: 900px) {
  .setting-card__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
