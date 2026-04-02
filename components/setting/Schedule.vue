<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Automation</p>
        <h3 class="setting-card__title">后台定时任务</h3>
      </div>
    </template>

    <div class="setting-card__stack">
      <div class="setting-card__panel">
        <div class="setting-card__panel-head">
          <p class="setting-card__panel-title">消息通知</p>
          <span
            class="setting-card__status"
            :class="{ 'setting-card__status--active': Boolean(snapshot?.config.alertWebhookUrl) }"
          >
            {{ snapshot?.config.alertWebhookUrl ? 'Webhook 已配置' : 'Webhook 未配置' }}
          </span>
        </div>

        <UInput
          v-model="form.alertWebhookUrl"
          class="setting-card__input"
          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
        />

        <div class="setting-card__panel-actions">
          <UButton color="blue" size="sm" class="setting-card__button" :loading="isSaving" @click="saveConfig">
            保存配置
          </UButton>
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
        <div class="setting-card__panel-head">
          <div class="setting-card__panel-heading">
            <p class="setting-card__panel-title">公众号同步</p>
            <span class="setting-card__status" :class="{ 'setting-card__status--active': form.syncEnabled }">
              {{ form.syncEnabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <UCheckbox v-model="form.syncEnabled" label="启用" />
        </div>

        <div class="setting-card__panel-actions">
          <UInput
            v-model="form.syncIntervalMinutes"
            type="number"
            min="1"
            class="setting-card__field setting-card__field--mono"
            placeholder="同步间隔"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">分钟</span>
            </template>
          </UInput>
          <UButton color="blue" size="sm" class="setting-card__button" :loading="isSaving" @click="saveConfig">保存配置</UButton>
          <UButton
            color="gray"
            size="sm"
            class="setting-card__button"
            :loading="snapshot?.state.syncRunning"
            :disabled="snapshot?.state.downloadRunning"
            @click="runTask('sync')"
          >
            立即同步
          </UButton>
        </div>

        <div class="setting-card__detail-grid">
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">登录态</span>
            <span class="setting-card__detail-value">{{ snapshot?.config.authBound ? '已绑定' : '未绑定' }}</span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">绑定时间</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.config.authBoundAt ?? null) }}</span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">上次开始</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.state.lastSyncStartedAt ?? null) }}</span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">上次完成</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.state.lastSyncFinishedAt ?? null) }}</span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">下次计划</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.state.nextSyncAt ?? null) }}</span>
          </div>
          <div v-if="snapshot?.state.lastSyncSummary" class="setting-card__detail setting-card__detail--wide">
            <span class="setting-card__detail-label">最近结果</span>
            <span class="setting-card__detail-value setting-card__detail-value--info">
              {{ snapshot.state.lastSyncSummary }}
            </span>
          </div>
          <div v-if="snapshot?.state.lastSyncError" class="setting-card__detail setting-card__detail--wide">
            <span class="setting-card__detail-label">最近错误</span>
            <span class="setting-card__detail-value setting-card__detail-value--danger">
              {{ snapshot.state.lastSyncError }}
            </span>
          </div>
        </div>
      </div>

      <div class="setting-card__panel">
        <div class="setting-card__panel-head">
          <div class="setting-card__panel-heading">
            <p class="setting-card__panel-title">HTML 下载</p>
            <span class="setting-card__status" :class="{ 'setting-card__status--active': form.downloadEnabled }">
              {{ form.downloadEnabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <UCheckbox v-model="form.downloadEnabled" label="启用" />
        </div>

        <div class="setting-card__panel-actions">
          <UInput
            v-model="form.downloadIntervalMinutes"
            type="number"
            min="1"
            class="setting-card__field setting-card__field--mono"
            placeholder="抓取间隔"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">分钟</span>
            </template>
          </UInput>
          <UInput
            v-model="form.downloadBatchSize"
            type="number"
            min="1"
            class="setting-card__field setting-card__field--mono"
            placeholder="每轮抓取上限"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">篇</span>
            </template>
          </UInput>
          <UButton color="blue" size="sm" class="setting-card__button" :loading="isSaving" @click="saveConfig">保存配置</UButton>
          <UButton
            color="gray"
            size="sm"
            class="setting-card__button"
            :loading="snapshot?.state.downloadRunning"
            :disabled="snapshot?.state.syncRunning"
            @click="runTask('download')"
          >
            立即抓取
          </UButton>
        </div>

        <div class="setting-card__detail-grid">
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">上次开始</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.state.lastDownloadStartedAt ?? null) }}</span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">上次完成</span>
            <span class="setting-card__detail-value">
              {{ formatTimestamp(snapshot?.state.lastDownloadFinishedAt ?? null) }}
            </span>
          </div>
          <div class="setting-card__detail">
            <span class="setting-card__detail-label">下次计划</span>
            <span class="setting-card__detail-value">{{ formatTimestamp(snapshot?.state.nextDownloadAt ?? null) }}</span>
          </div>
          <div v-if="snapshot?.state.lastDownloadSummary" class="setting-card__detail setting-card__detail--wide">
            <span class="setting-card__detail-label">最近结果</span>
            <span class="setting-card__detail-value setting-card__detail-value--info">
              {{ snapshot.state.lastDownloadSummary }}
            </span>
          </div>
          <div v-if="snapshot?.state.lastDownloadError" class="setting-card__detail setting-card__detail--wide">
            <span class="setting-card__detail-label">最近错误</span>
            <span class="setting-card__detail-value setting-card__detail-value--danger">
              {{ snapshot.state.lastDownloadError }}
            </span>
          </div>
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
  border-radius: 0.95rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
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
  font-size: 1.05rem;
  font-weight: 700;
}

.setting-card__stack {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.setting-card__panel,
.setting-card__stat {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.95rem;
  padding: 0.9rem 0.95rem;
  background: rgba(248, 251, 255, 0.82);
}

.setting-card__panel {
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
}

.setting-card__panel-head,
.setting-card__panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.setting-card__panel-title {
  color: #111111;
  font-size: 0.96rem;
  font-weight: 600;
}

.setting-card__status {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  padding: 0.08rem 0.64rem;
  background: rgba(255, 255, 255, 0.88);
  color: rgba(15, 23, 42, 0.56);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__status--active {
  border-color: rgba(37, 99, 235, 0.12);
  background: rgba(239, 246, 255, 0.88);
  color: #1d4ed8;
}

.setting-card__input :deep(input),
.setting-card__field :deep(input) {
  min-height: 2.5rem;
  border-radius: 0.78rem;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
}

.setting-card__field {
  width: 100%;
  max-width: 10rem;
}

.setting-card__field--mono :deep(input) {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__panel-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.55rem;
}

.setting-card__button {
  min-height: 2.4rem;
  border-radius: 0.78rem;
}

.setting-card__stats {
  display: grid;
  gap: 0.7rem;
}

.setting-card__stat-label {
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.8rem;
  font-weight: 600;
}

.setting-card__stat-value {
  margin-top: 0.25rem;
  color: #111111;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.setting-card__detail-grid {
  display: grid;
  gap: 0.55rem;
}

.setting-card__detail {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 0.78rem;
  padding: 0.62rem 0.72rem;
  background: rgba(255, 255, 255, 0.72);
}

.setting-card__detail--wide {
  grid-column: 1 / -1;
}

.setting-card__detail-label {
  color: rgba(15, 23, 42, 0.46);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.setting-card__detail-value {
  color: #0f172a;
  font-size: 0.8rem;
  line-height: 1.55;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__detail-value--info {
  color: #2563eb;
}

.setting-card__detail-value--danger {
  color: #e11d48;
}

@media (max-width: 767px) {
  .setting-card__panel-head {
    align-items: flex-start;
  }
}

@media (min-width: 900px) {
  .setting-card__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .setting-card__detail-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
