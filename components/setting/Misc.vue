<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Behavior</p>
        <h3 class="setting-card__title">其他</h3>
        <p class="setting-card__summary">控制列表过滤、内容刷新策略和同步时间边界。</p>
      </div>
    </template>

    <div class="setting-card__layout">
      <div class="setting-card__group">
        <div class="setting-card__option">
          <UCheckbox v-model="preferences.hideDeleted" name="hideDeleted" label="隐藏已删除文章" />
          <UPopover mode="hover" :popper="{ placement: 'top' }">
            <template #panel>
              <p class="setting-card__popover-text">
                是否在文章下载表格中显示已删除的文章。<br />
                若勾选该选项，则文章下载表格将过滤掉已经被删除的文章(无论文章内容是否已被下载)。
              </p>
            </template>
            <UIcon color="gray" name="i-heroicons:question-mark-circle-16-solid" class="size-5" />
          </UPopover>
        </div>

        <div class="setting-card__option">
          <UCheckbox
            v-model="preferences.downloadConfig.forceDownloadContent"
            name="forceDownloadContent"
            label="强制下载文章内容"
          />
          <UPopover mode="hover" :popper="{ placement: 'top' }">
            <template #panel>
              <p class="setting-card__popover-text">
                在抓取文章内容时，若该文章内容已被下载，则会跳过抓取过程。<br />
                若勾选该选项，则会忽略已缓存内容，强制重新下载最新文章内容。<br />
              </p>
            </template>
            <UIcon color="gray" name="i-heroicons:question-mark-circle-16-solid" class="size-5" />
          </UPopover>
        </div>
      </div>

      <div class="setting-card__group">
        <div class="setting-card__panel">
          <p class="setting-card__label">
            <span>公众号同步频率</span>
            <UPopover mode="hover" :popper="{ placement: 'top' }">
              <template #panel>
                <p class="setting-card__popover-text">
                  在同步公众号文章数据时，程序会自动抓取该公众号的所有文章，直到所有数据同步完成。<br />
                  该选项用于控制抓取频率，比如设置为 5
                  就表示每五秒抓取一次。该数据越小，同步的越快，但是容易被封号。推荐不小于3
                </p>
              </template>
              <UIcon color="gray" name="i-heroicons:question-mark-circle-16-solid" class="size-5" />
            </UPopover>
          </p>
          <UInput
            v-model="preferences.accountSyncSeconds"
            class="setting-card__number"
            type="number"
            placeholder="配置公众号同步频率"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">秒</span>
            </template>
          </UInput>
        </div>
      </div>
    </div>

    <div class="setting-card__range">
      <p class="setting-card__range-header">
        <span class="setting-card__range-title">
          同步时间范围
          <span class="setting-card__range-note">(说明: 只能从当前时间开始往前同步)</span>
        </span>
        <span class="setting-card__range-value">实际同步范围: {{ getActualDateRange() }}</span>
      </p>

      <div class="setting-card__range-controls">
        <USelectMenu
          v-model="preferences.syncDateRange"
          class="setting-card__range-select"
          :options="DURATION_OPTIONS"
          value-attribute="value"
          option-attribute="label"
        />
        <UPopover v-if="preferences.syncDateRange === 'point'" :popper="{ placement: 'bottom-start' }">
          <UButton color="gray" icon="i-heroicons-calendar-days-20-solid" :label="formatDate()" />

          <template #panel="{ close }">
            <BaseDatePicker v-model="preferences.syncDatePoint" is-required @close="close" />
          </template>
        </UPopover>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import type { Preferences } from '~/types/preferences';

const { getActualDateRange, getSelectOptions } = useSyncDeadline();

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

const DURATION_OPTIONS = getSelectOptions();

function formatDate() {
  return dayjs.unix(preferences.value.syncDatePoint).format('YYYY-MM-DD');
}
</script>

<style scoped>
.setting-card {
  margin: 0;
  min-width: 0;
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
  font-size: 1.16rem;
  font-weight: 700;
}

.setting-card__summary {
  color: rgba(15, 23, 42, 0.66);
  font-size: 0.9rem;
  line-height: 1.65;
}

.setting-card__layout {
  display: grid;
  gap: 1rem;
}

.setting-card__group {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.setting-card__option,
.setting-card__panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.2rem;
  padding: 0.95rem 1rem;
  background: rgba(247, 246, 241, 0.86);
}

.setting-card__option {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.setting-card__label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
  color: #111111;
  font-size: 0.94rem;
  font-weight: 600;
}

.setting-card__number {
  width: 100%;
  max-width: 11rem;
}

.setting-card__number :deep(input) {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__range {
  margin-top: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.3rem;
  padding: 1rem;
  background: rgba(247, 246, 241, 0.78);
}

.setting-card__range-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.setting-card__range-title {
  color: #111111;
  font-size: 1rem;
  font-weight: 600;
}

.setting-card__range-note {
  margin-left: 0.35rem;
  color: rgba(15, 23, 42, 0.48);
  font-size: 0.75rem;
  font-weight: 500;
}

.setting-card__range-value {
  color: #2563eb;
  font-size: 0.84rem;
  font-weight: 600;
}

.setting-card__range-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.setting-card__range-select {
  width: 100%;
}

.setting-card__popover-text {
  max-width: 20rem;
  padding: 0.9rem 1rem;
  color: rgba(15, 23, 42, 0.62);
  font-size: 0.82rem;
  line-height: 1.65;
}

@media (min-width: 900px) {
  .setting-card__layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .setting-card__range-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .setting-card__range-select {
    width: min(100%, 17rem);
  }
}
</style>
