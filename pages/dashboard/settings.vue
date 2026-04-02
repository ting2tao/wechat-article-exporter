<template>
  <div class="settings-page">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">设置</h1>
    </Teleport>

    <div class="settings-grid">
      <div
        v-for="section in sections"
        :id="section.id"
        :key="section.id"
        class="settings-grid__item"
        :class="{ 'settings-grid__item--wide': section.wide }"
      >
        <component :is="section.component" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingExport from '~/components/setting/Export.vue';
import SettingMisc from '~/components/setting/Misc.vue';
import SettingProxy from '~/components/setting/Proxy.vue';
import SettingSchedule from '~/components/setting/Schedule.vue';
import SettingSecurity from '~/components/setting/Security.vue';
import { websiteName } from '~/config';

const sections = [
  {
    id: 'proxy',
    component: SettingProxy,
    wide: true,
  },
  {
    id: 'export',
    component: SettingExport,
  },
  {
    id: 'behavior',
    component: SettingMisc,
  },
  {
    id: 'security',
    component: SettingSecurity,
  },
  {
    id: 'schedule',
    component: SettingSchedule,
    wide: true,
  },
] as const;

useHead({
  title: `设置 | ${websiteName}`,
});
</script>

<style scoped>
.settings-page {
  display: flex;
  min-height: max-content;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.settings-grid {
  display: grid;
  gap: 0.8rem;
}

.settings-grid__item {
  min-width: 0;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 0.75rem;
  }
}

@media (min-width: 1100px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-grid__item--wide {
    grid-column: span 2;
  }
}
</style>
