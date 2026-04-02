<template>
  <div class="settings-page">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">设置</h1>
    </Teleport>

    <header class="settings-header">
      <div class="settings-header__copy">
        <h2 class="settings-header__headline">常用配置直接可见，细节在需要时再展开。</h2>
        <p class="settings-header__summary">代理、导出、抓取、安全和自动化都保留在一页里，但不再同时把所有说明摊开。</p>
      </div>

      <div class="settings-header__switcher">
        <button
          v-for="section in sections"
          :key="section.id"
          class="settings-header__chip"
          :class="{ 'settings-header__chip--active': openSection === section.id }"
          type="button"
          @click="focusSection(section.id)"
        >
          {{ section.title }}
        </button>
      </div>
    </header>

    <div class="settings-stack">
      <section
        v-for="section in sections"
        :id="section.id"
        :key="section.id"
        class="settings-section"
        :class="{ 'settings-section--open': openSection === section.id }"
      >
        <button class="settings-section__head" type="button" @click="toggleSection(section.id)">
          <div class="settings-section__meta">
            <h3 class="settings-section__title">{{ section.title }}</h3>
            <p class="settings-section__description">{{ section.description }}</p>
          </div>
          <span class="settings-section__action">
            {{ openSection === section.id ? '收起' : '展开' }}
          </span>
        </button>

        <Transition name="settings-section">
          <div v-if="openSection === section.id" class="settings-section__body">
            <component :is="section.component" />
          </div>
        </Transition>
      </section>

      <div class="h-24"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import SettingExport from '~/components/setting/Export.vue';
import SettingMisc from '~/components/setting/Misc.vue';
import SettingProxy from '~/components/setting/Proxy.vue';
import SettingSchedule from '~/components/setting/Schedule.vue';
import SettingSecurity from '~/components/setting/Security.vue';
import { websiteName } from '~/config';

const sections = [
  {
    id: 'proxy',
    title: '代理',
    description: '决定抓取资源通过哪里访问。',
    component: SettingProxy,
  },
  {
    id: 'export',
    title: '导出',
    description: '控制目录命名和默认导出内容。',
    component: SettingExport,
  },
  {
    id: 'behavior',
    title: '抓取',
    description: '调整同步频率、过滤和时间范围。',
    component: SettingMisc,
  },
  {
    id: 'security',
    title: '安全',
    description: '更新系统账号与密码。',
    component: SettingSecurity,
  },
  {
    id: 'schedule',
    title: '自动化',
    description: '配置后台同步、下载和通知。',
    component: SettingSchedule,
  },
] as const;

const openSection = ref<(typeof sections)[number]['id']>('proxy');

async function focusSection(id: (typeof sections)[number]['id']) {
  openSection.value = id;
  await nextTick();
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function toggleSection(id: (typeof sections)[number]['id']) {
  openSection.value = openSection.value === id ? 'proxy' : id;
}

useHead({
  title: `设置 | ${websiteName}`,
});
</script>

<style scoped>
.settings-page {
  --settings-ink: #111111;
  --settings-muted: rgba(15, 23, 42, 0.58);
  --settings-soft: rgba(15, 23, 42, 0.42);
  --settings-border: rgba(15, 23, 42, 0.08);
  display: flex;
  min-height: max-content;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.settings-header {
  display: grid;
  gap: 0.9rem;
  border: 1px solid var(--settings-border);
  border-radius: 1.45rem;
  padding: 1.1rem;
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.38), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 245, 240, 0.93) 100%);
  box-shadow:
    0 16px 36px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.settings-header__copy {
  display: flex;
  max-width: 42rem;
  flex-direction: column;
  gap: 0.35rem;
}

.settings-header__headline {
  color: var(--settings-ink);
  font-family: 'Segoe UI Variable Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.34rem, 1.8vw, 1.9rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.settings-header__summary,
.settings-section__description {
  color: var(--settings-muted);
  font-size: 0.9rem;
  line-height: 1.66;
}

.settings-header__switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.settings-header__chip {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.48rem 0.85rem;
  background: rgba(255, 255, 255, 0.78);
  color: rgba(15, 23, 42, 0.74);
  font-size: 0.84rem;
  font-weight: 700;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.settings-header__chip:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.12);
  color: var(--settings-ink);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
}

.settings-header__chip--active {
  border-color: #111111;
  background: #111111;
  color: white;
}

.settings-stack {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.settings-section {
  overflow: hidden;
  border: 1px solid var(--settings-border);
  border-radius: 1.35rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 246, 241, 0.9) 100%);
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  scroll-margin-top: 1rem;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.settings-section--open {
  border-color: rgba(15, 23, 42, 0.14);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.settings-section__head {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.05rem;
  text-align: left;
}

.settings-section__meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.18rem;
}

.settings-section__title {
  color: var(--settings-ink);
  font-size: 1rem;
  font-weight: 700;
}

.settings-section__action {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.38rem 0.72rem;
  color: rgba(15, 23, 42, 0.62);
  font-size: 0.8rem;
  font-weight: 700;
}

.settings-section__body {
  padding: 0 0.9rem 0.95rem;
}

.settings-section-enter-active,
.settings-section-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.settings-section-enter-from,
.settings-section-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.settings-section__body :deep(.setting-card) {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.3rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(247, 245, 240, 0.9) 100%);
  box-shadow: none;
}

.settings-section__body :deep(.setting-card__summary),
.settings-section__body :deep(.setting-card__hint),
.settings-section__body :deep(.setting-card__panel-summary),
.settings-section__body :deep(.setting-card__popover-text) {
  color: rgba(15, 23, 42, 0.58);
}

.settings-section__body :deep(.setting-card__note),
.settings-section__body :deep(.setting-card__toggle),
.settings-section__body :deep(.setting-card__option),
.settings-section__body :deep(.setting-card__panel),
.settings-section__body :deep(.setting-card__range),
.settings-section__body :deep(.setting-card__stat) {
  background: rgba(248, 246, 241, 0.78);
}

@media (min-width: 960px) {
  .settings-page {
    padding: 1.1rem;
  }

  .settings-header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    padding: 1.2rem 1.25rem;
  }

  .settings-header__switcher {
    justify-content: flex-end;
  }

  .settings-section__head {
    padding: 1.05rem 1.15rem;
  }

  .settings-section__body {
    padding: 0 1rem 1rem;
  }
}
</style>
