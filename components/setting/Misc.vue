<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Behavior</p>
        <h3 class="setting-card__title">抓取</h3>
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

.setting-card__layout {
  display: grid;
  gap: 0.78rem;
}

.setting-card__group {
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
}

.setting-card__option,
.setting-card__panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.82rem 0.9rem;
  background: rgba(248, 251, 255, 0.82);
}

.setting-card__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.setting-card__label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
  color: #111111;
  font-size: 0.88rem;
  font-weight: 600;
}

.setting-card__number {
  width: 100%;
  max-width: 10rem;
}

.setting-card__number :deep(input) {
  min-height: 2.5rem;
  border-radius: 0.78rem;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__range {
  margin-top: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.95rem;
  padding: 0.88rem 0.95rem;
  background: rgba(248, 251, 255, 0.78);
}

.setting-card__range-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.setting-card__range-title {
  color: #111111;
  font-size: 0.94rem;
  font-weight: 600;
}

.setting-card__range-value {
  display: inline-flex;
  align-items: center;
  min-height: 1.95rem;
  border-radius: 999px;
  padding: 0.08rem 0.7rem;
  background: rgba(239, 246, 255, 0.92);
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__range-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.setting-card__range-select {
  width: 100%;
}

.setting-card__range-select :deep(button),
.setting-card__range-controls :deep(button) {
  min-height: 2.45rem;
  border-radius: 0.78rem;
}

.setting-card__option :deep(label) {
  font-size: 0.88rem;
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
    width: min(100%, 15rem);
  }
}
</style>
