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
          <div class="setting-card__panel-heading">
            <p class="setting-card__panel-title">任务范围</p>
            <span class="setting-card__status" :class="{ 'setting-card__status--active': form.selectedAccountFakeids.length > 0 }">
              {{ form.selectedAccountFakeids.length > 0 ? `已选 ${form.selectedAccountFakeids.length} 个公众号` : '未选择公众号' }}
            </span>
          </div>
        </div>

        <p class="setting-card__panel-note">
          后台同步与定时导出都会限制在这里选中的公众号范围内。未选择时，不会默认包含全部公众号。
        </p>

        <div class="setting-card__field-stack">
          <div class="setting-card__field-group">
            <p class="setting-card__field-label">公众号选择</p>
            <USelectMenu
              v-model="form.selectedAccountFakeids"
              multiple
              searchable
              clear-search-on-close
              searchable-placeholder="筛选公众号..."
              class="setting-card__select"
              placeholder="请选择要纳入定时任务的公众号"
              :options="accountOptions"
              value-attribute="fakeid"
              option-attribute="nickname"
            >
              <template #option="{ option: account }">
                <UAvatar v-if="account.round_head_img" :src="account.round_head_img" size="sm" />
                <div class="setting-card__select-option">
                  <p class="setting-card__select-option-title">
                    {{ account.nickname || account.fakeid }}
                  </p>
                  <p class="setting-card__select-option-subtitle">fakeid: {{ account.fakeid }}</p>
                </div>
              </template>
              <template #option-empty="{ query }">
                未找到匹配「{{ query }}」的公众号<br />请先在「<NuxtLink
                  to="/dashboard/account"
                  class="text-blue-500 hover:underline"
                  >公众号管理</NuxtLink
                >」中添加
              </template>
              <template #empty>
                暂无公众号，请先在「<NuxtLink to="/dashboard/account" class="text-blue-500 hover:underline">公众号管理</NuxtLink
                >」中添加
              </template>
            </USelectMenu>
          </div>

          <div class="setting-card__field-group">
            <p class="setting-card__field-label">定时导出格式</p>
            <USelectMenu
              v-model="form.selectedExportFormats"
              multiple
              class="setting-card__select"
              placeholder="请选择逐篇导出格式"
              :options="scheduledExportFormatOptions"
              value-attribute="value"
              option-attribute="label"
            >
              <template #option="{ option: format }">
                <div class="setting-card__select-option">
                  <p class="setting-card__select-option-title">{{ format.label }}</p>
                  <p class="setting-card__select-option-subtitle">{{ format.remark }}</p>
                </div>
              </template>
            </USelectMenu>
            <p class="setting-card__panel-note">
              仅支持 HTML、TXT、Markdown。Word、Excel 和 JSON 仍保留为手动导出，不进入定时任务。
            </p>
          </div>
        </div>
      </div>

      <div class="setting-card__panel">
        <div class="setting-card__panel-head">
          <p class="setting-card__panel-title">消息通知</p>
          <span
            class="setting-card__status"
            :class="{ 'setting-card__status--active': Boolean(form.alertWebhookUrl) }"
          >
            {{ form.alertWebhookUrl ? 'Webhook 已配置' : 'Webhook 未配置' }}
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
            <p class="setting-card__panel-title">定时导出</p>
            <span class="setting-card__status" :class="{ 'setting-card__status--active': form.downloadEnabled }">
              {{ form.downloadEnabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <UCheckbox v-model="form.downloadEnabled" label="启用" />
        </div>

        <div class="setting-card__panel-actions">
          <USelectMenu
            v-model="form.downloadDateRangeType"
            class="setting-card__field"
            :options="downloadDateRangeTypeOptions"
            value-attribute="value"
            option-attribute="label"
          >
            <template #option="{ option: rangeType }">
              <div class="setting-card__select-option">
                <p class="setting-card__select-option-title">{{ rangeType.label }}</p>
                <p class="setting-card__select-option-subtitle">{{ rangeType.remark }}</p>
              </div>
            </template>
          </USelectMenu>
          <UInput
            v-if="form.downloadDateRangeType === 'recentDays'"
            v-model="form.downloadRecentDays"
            type="number"
            min="1"
            class="setting-card__field setting-card__field--mono"
            placeholder="最近天数"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">天</span>
            </template>
          </UInput>
          <UInput
            v-if="form.downloadDateRangeType === 'customRange'"
            v-model="form.downloadDateStart"
            type="date"
            class="setting-card__field"
            placeholder="开始日期"
          />
          <UInput
            v-if="form.downloadDateRangeType === 'customRange'"
            v-model="form.downloadDateEnd"
            type="date"
            class="setting-card__field"
            placeholder="结束日期"
          />
          <UInput
            v-model="form.downloadIntervalMinutes"
            type="number"
            min="1"
            class="setting-card__field setting-card__field--mono"
            placeholder="导出间隔"
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
            placeholder="每轮导出上限"
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
            立即导出
          </UButton>
        </div>

        <p class="setting-card__panel-note">
          按文章发布时间筛选待导出文章。已经成功导出的文章不会重复导出。
        </p>

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
import { getAllInfo, type MpAccount } from '~/store/v2/info';
import type {
  ScheduledExportDateRangeType,
  ScheduledExportFormat,
  WorkerSchedulerSnapshot,
} from '~/types/worker-scheduler';

interface ScheduledExportFormatOption {
  label: string;
  value: ScheduledExportFormat;
  remark: string;
}

interface ScheduledExportDateRangeOption {
  label: string;
  value: ScheduledExportDateRangeType;
  remark: string;
}

interface WorkerSchedulerSnapshotView extends Omit<WorkerSchedulerSnapshot, 'config'> {
  config: WorkerSchedulerSnapshot['config'] & {
    selectedAccountFakeids: string[];
    selectedExportFormats: ScheduledExportFormat[];
  };
}

const toast = toastFactory();

const snapshot = ref<WorkerSchedulerSnapshotView | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isDirty = ref(false);
const suppressDirtyTracking = ref(false);

const accountOptions = [...(await getAllInfo())].sort((a: MpAccount, b: MpAccount) => {
  if (a.articles !== b.articles) {
    return b.articles - a.articles;
  }

  return (a.nickname || a.fakeid).localeCompare(b.nickname || b.fakeid, 'zh-Hans-CN');
});

const scheduledExportFormatOptions: ScheduledExportFormatOption[] = [
  { label: 'HTML', value: 'html', remark: '适合保留原始排版' },
  { label: 'TXT', value: 'txt', remark: '纯文本逐篇导出' },
  { label: 'Markdown', value: 'markdown', remark: '便于后续整理编辑' },
];

const downloadDateRangeTypeOptions: ScheduledExportDateRangeOption[] = [
  { label: '全部时间', value: 'all', remark: '导出未处理过的全部文章' },
  { label: '最近 N 天', value: 'recentDays', remark: '例如只导出最近 3 天的新文章' },
  { label: '自定义时间', value: 'customRange', remark: '按文章发布时间筛选开始和结束日期' },
];

const form = reactive({
  syncEnabled: false,
  syncIntervalMinutes: 60,
  downloadEnabled: false,
  downloadIntervalMinutes: 60,
  downloadBatchSize: 50,
  downloadDateRangeType: 'all' as ScheduledExportDateRangeType,
  downloadRecentDays: 3,
  downloadDateStart: '',
  downloadDateEnd: '',
  alertWebhookUrl: '',
  selectedAccountFakeids: [] as string[],
  selectedExportFormats: [] as ScheduledExportFormat[],
});

let refreshTimer: number | null = null;

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return '--';
  }

  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function normalizeSelectedAccountFakeids(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  const selected = values
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter((item): item is string => item.length > 0);

  return [...new Set(selected)];
}

function normalizeSelectedExportFormats(values: unknown) {
  const allowedFormats = ['html', 'txt', 'markdown'] as const;
  const allowed = new Set<ScheduledExportFormat>(allowedFormats);

  if (!Array.isArray(values)) {
    return [];
  }

  const selected = values
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter((item): item is ScheduledExportFormat => allowed.has(item as ScheduledExportFormat));

  return [...new Set(selected)];
}

function normalizeDownloadDateRangeType(value: unknown): ScheduledExportDateRangeType {
  return value === 'recentDays' || value === 'customRange' ? value : 'all';
}

function normalizeDownloadRecentDays(value: unknown) {
  return Math.max(1, Number(value) || 3);
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

function applySnapshot(value: WorkerSchedulerSnapshotView, syncForm = false) {
  snapshot.value = value;

  if (!syncForm && isDirty.value) {
    return;
  }

  suppressDirtyTracking.value = true;
  try {
    form.syncEnabled = value.config.syncEnabled;
    form.syncIntervalMinutes = value.config.syncIntervalMinutes;
    form.downloadEnabled = value.config.downloadEnabled;
    form.downloadIntervalMinutes = value.config.downloadIntervalMinutes;
    form.downloadBatchSize = value.config.downloadBatchSize;
    form.downloadDateRangeType = normalizeDownloadDateRangeType(value.config.downloadDateRangeType);
    form.downloadRecentDays = normalizeDownloadRecentDays(value.config.downloadRecentDays);
    form.downloadDateStart = normalizeDateInput(value.config.downloadDateStart);
    form.downloadDateEnd = normalizeDateInput(value.config.downloadDateEnd);
    form.alertWebhookUrl = value.config.alertWebhookUrl;
    form.selectedAccountFakeids = normalizeSelectedAccountFakeids(value.config.selectedAccountFakeids);
    form.selectedExportFormats = normalizeSelectedExportFormats(value.config.selectedExportFormats);
    isDirty.value = false;
  } finally {
    suppressDirtyTracking.value = false;
  }
}

async function refreshSnapshot(showError = false) {
  try {
    isLoading.value = true;
    applySnapshot((await getWorkerSchedulerSnapshot()) as WorkerSchedulerSnapshotView);
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
    const syncIntervalMinutes = Math.max(1, Number(form.syncIntervalMinutes) || 1);
    const downloadIntervalMinutes = Math.max(1, Number(form.downloadIntervalMinutes) || 1);
    const downloadBatchSize = Math.max(1, Number(form.downloadBatchSize) || 1);
    const downloadRecentDays = normalizeDownloadRecentDays(form.downloadRecentDays);
    const next = (await saveWorkerSchedulerConfig({
      syncEnabled: form.syncEnabled,
      syncIntervalMinutes,
      downloadEnabled: form.downloadEnabled,
      downloadIntervalMinutes,
      downloadBatchSize,
      downloadDateRangeType: normalizeDownloadDateRangeType(form.downloadDateRangeType),
      downloadRecentDays,
      downloadDateStart: normalizeDateInput(form.downloadDateStart),
      downloadDateEnd: normalizeDateInput(form.downloadDateEnd),
      alertWebhookUrl: form.alertWebhookUrl.trim(),
      selectedAccountFakeids: [...normalizeSelectedAccountFakeids(form.selectedAccountFakeids)],
      selectedExportFormats: [...normalizeSelectedExportFormats(form.selectedExportFormats)],
    })) as WorkerSchedulerSnapshotView;
    applySnapshot(next, true);
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
    applySnapshot(result.snapshot as WorkerSchedulerSnapshotView, true);
    toast.success(result.started ? '后台任务已启动' : '后台任务正在运行中');
  } catch (error) {
    toast.error('启动后台任务失败', error instanceof Error ? error.message : String(error));
  }
}

watch(
  () => [
    form.syncEnabled,
    form.syncIntervalMinutes,
    form.downloadEnabled,
    form.downloadIntervalMinutes,
    form.downloadBatchSize,
    form.downloadDateRangeType,
    form.downloadRecentDays,
    form.downloadDateStart,
    form.downloadDateEnd,
    form.alertWebhookUrl,
    form.selectedAccountFakeids.join('\u0001'),
    form.selectedExportFormats.join('\u0001'),
  ],
  () => {
    if (!suppressDirtyTracking.value) {
      isDirty.value = true;
    }
  },
  { flush: 'sync' }
);

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

.setting-card__panel-note {
  color: rgba(15, 23, 42, 0.54);
  font-size: 0.8rem;
  line-height: 1.5;
}

.setting-card__panel-head,
.setting-card__panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.setting-card__field-stack {
  display: grid;
  gap: 0.78rem;
}

.setting-card__field-group {
  display: grid;
  gap: 0.45rem;
}

.setting-card__field-label {
  color: #111111;
  font-size: 0.88rem;
  font-weight: 600;
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

.setting-card__select {
  width: 100%;
}

.setting-card__select-option {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.setting-card__select-option-title {
  color: #111111;
  font-size: 0.9rem;
  font-weight: 600;
}

.setting-card__select-option-subtitle {
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.76rem;
  line-height: 1.4;
}

.setting-card__input :deep(input),
.setting-card__field :deep(input) {
  min-height: 2.5rem;
  border-radius: 0.78rem;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
}

.setting-card__select :deep(input) {
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
