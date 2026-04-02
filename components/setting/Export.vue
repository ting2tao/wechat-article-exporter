<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Export</p>
        <h3 class="setting-card__title">导出选项</h3>
      </div>
    </template>

    <div class="setting-card__stack">
      <section class="setting-card__section">
        <p class="setting-card__label">
          <span>导出目录名</span>
          <span class="setting-card__label-action">
            <UPopover mode="hover" :popper="{ placement: 'right' }">
              <UButton class="setting-card__icon-button" color="white" size="xs" trailing-icon="i-heroicons:variable-16-solid" />

              <template #panel>
                <div class="setting-card__popover">
                  <p class="setting-card__popover-text">
                    使用 <code>${变量名}</code> 的格式插入变量，例如：<code>${YYYY}-${MM}-${DD}_${title}</code>
                  </p>
                  <p class="setting-card__popover-title">支持的变量</p>
                  <table class="setting-card__table">
                    <tbody>
                      <tr>
                        <th class="w-20">变量</th>
                        <th class="w-32">含义</th>
                        <th class="w-20">变量</th>
                        <th class="w-32">含义</th>
                      </tr>
                      <tr v-for="(item, idx) in variables" :key="idx">
                        <td class="text-center">{{ item[0].name }}</td>
                        <td class="text-center">{{ item[0].description }}</td>
                        <td class="text-center">{{ item[1].name }}</td>
                        <td class="text-center">{{ item[1].description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </UPopover>
          </span>
        </p>
        <UInput
          v-model="preferences.exportConfig.dirname"
          class="setting-card__input setting-card__input--mono"
          name="dirname"
          placeholder="目录名格式"
        />

        <p class="setting-card__preview">
          <span class="setting-card__preview-label">预览</span>
          <span class="setting-card__preview-value">{{ dirnamePreview }}</span>
        </p>
      </section>

      <section class="setting-card__section">
        <div class="setting-card__compact-row">
          <div class="setting-card__compact-copy">
            <p class="setting-card__label setting-card__label--inline">目录名最大长度</p>
            <p class="setting-card__hint">0 表示不限制</p>
          </div>
          <UInput
            v-model="preferences.exportConfig.maxlength"
            class="setting-card__number"
            placeholder="目录名最大长度"
            type="number"
            min="0"
          />
        </div>
      </section>

      <section class="setting-card__toggles">
        <label class="setting-card__toggle">
          <UCheckbox
            v-model="preferences.exportConfig.exportExcelIncludeContent"
            name="exportExcelIncludeContent"
            label="导出 Excel 中包含文章内容"
          />
        </label>
        <label class="setting-card__toggle">
          <UCheckbox
            v-model="preferences.exportConfig.exportJsonIncludeContent"
            name="exportJsonIncludeContent"
            label="导出 JSON 中包含文章内容"
          />
        </label>
      </section>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Preferences } from '~/types/preferences';

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

const sampleData: Record<string, string> = {
  account: '人民日报',
  title: '这是一篇示例文章标题',
  aid: '100000001',
  author: '张三',
  YYYY: '2025',
  MM: '03',
  DD: '15',
  HH: '10',
  mm: '30',
};

const dirnamePreview = computed(() => {
  let result = preferences.value.exportConfig.dirname || '';
  for (const [key, value] of Object.entries(sampleData)) {
    result = result.replace(new RegExp(`\\$\\{${key}}`, 'g'), value);
  }
  const maxlength = preferences.value.exportConfig.maxlength;
  if (maxlength) {
    result = result.slice(0, maxlength);
  }
  return result || '（空）';
});

const _variables = [
  { name: 'account', description: '公众号名称' },
  { name: 'title', description: '文章标题' },
  { name: 'aid', description: '文章id' },
  { name: 'author', description: '作者' },
  { name: 'YYYY', description: '年' },
  { name: 'MM', description: '月' },
  { name: 'DD', description: '日' },
  { name: 'HH', description: '时' },
  { name: 'mm', description: '分' },
];
const variables = Array.from({ length: Math.ceil(_variables.length / 2) }, (_, i) => [
  _variables[i * 2] ?? {},
  _variables[i * 2 + 1] ?? {},
]);
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

.setting-card__stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-card__section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.82rem 0.88rem;
  background: rgba(248, 251, 255, 0.78);
}

.setting-card__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: #111111;
  font-size: 0.9rem;
  font-weight: 600;
}

.setting-card__label--inline {
  justify-content: flex-start;
}

.setting-card__label-action {
  display: inline-flex;
}

.setting-card__icon-button {
  min-height: 2rem;
  border-radius: 0.7rem;
}

.setting-card__hint {
  color: rgba(15, 23, 42, 0.52);
  font-size: 0.76rem;
  line-height: 1.4;
}

.setting-card__input,
.setting-card__number {
  width: 100%;
}

.setting-card__number {
  max-width: 10rem;
}

.setting-card__compact-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.setting-card__compact-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.setting-card__input--mono :deep(input),
.setting-card__number :deep(input) {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__input :deep(input),
.setting-card__number :deep(input) {
  min-height: 2.5rem;
  border-radius: 0.78rem;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
}

.setting-card__preview {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  color: rgba(15, 23, 42, 0.54);
  font-size: 0.8rem;
}

.setting-card__preview-label {
  font-weight: 600;
}

.setting-card__preview-value {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  border-radius: 999px;
  padding: 0.1rem 0.62rem;
  background: rgba(239, 246, 255, 0.9);
  color: #111111;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__toggles {
  display: grid;
  gap: 0.65rem;
}

.setting-card__toggle {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.72rem 0.78rem;
  background: rgba(248, 251, 255, 0.82);
}

.setting-card__toggle :deep(label) {
  font-size: 0.88rem;
}

.setting-card__popover {
  max-width: 34rem;
  padding: 1rem;
}

.setting-card__popover-title {
  margin: 0.8rem 0 0.45rem;
  color: #111111;
  font-weight: 600;
}

.setting-card__popover-text {
  color: rgba(15, 23, 42, 0.62);
  font-size: 0.84rem;
  line-height: 1.7;
}

.setting-card__popover code {
  border-radius: 0.55rem;
  padding: 0.15rem 0.35rem;
  background: rgba(15, 23, 42, 0.06);
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  font-size: 0.76rem;
}

.setting-card__table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.95rem;
}

.setting-card__table th {
  background: rgba(241, 245, 249, 0.92);
  color: rgba(15, 23, 42, 0.64);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.55rem 0.35rem;
}

.setting-card__table td {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 0.45rem 0.55rem;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.82rem;
}

.setting-card__table tr:nth-child(even) {
  background: rgba(248, 251, 255, 0.78);
}

@media (min-width: 900px) {
  .setting-card__toggles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
