<template>
  <div class="api-page">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">API</h1>
    </Teleport>

    <div class="api-page__shell">
      <header class="api-page__toolbar">
        <div class="api-page__meta">
          <span class="api-page__meta-label">公开接口</span>
          <span class="api-page__meta-value">{{ apis.length }} 项</span>
        </div>
      </header>

      <div class="api-page__content">
        <ApiSummary />
        <div class="api-page__docs">
          <ApiDocument v-for="(api, idx) in apis" :key="idx" v-bind="api" :index="idx + 1" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';
import { apis } from '~/config/public-apis';

useHead({
  title: `API | ${websiteName}`,
});
</script>

<style scoped>
.api-page {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 1rem;
}

.api-page__shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.65rem;
}

.api-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.75rem 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.api-page__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.42rem 0.6rem;
  background: rgba(255, 255, 255, 0.9);
}

.api-page__meta-label {
  color: rgba(15, 23, 42, 0.46);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.api-page__meta-value {
  color: #111111;
  font-size: 0.84rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.api-page__content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 0.9rem;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(246, 249, 253, 0.93) 100%);
}

.api-page__docs {
  display: flex;
  flex-direction: column;
  gap: 4.5rem;
  margin-top: 2.5rem;
}

@media (max-width: 768px) {
  .api-page {
    padding: 0.75rem;
  }

  .api-page__toolbar,
  .api-page__content {
    padding: 0.72rem;
  }

  .api-page__docs {
    gap: 3rem;
    margin-top: 1.8rem;
  }
}
</style>
