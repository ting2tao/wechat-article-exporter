<template>
  <div class="proxy-page">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">公共代理</h1>
    </Teleport>

    <div class="proxy-page__shell">
      <header class="proxy-page__toolbar">
        <div class="proxy-page__stats">
          <div class="proxy-page__pill">
            <span class="proxy-page__pill-label">可用</span>
            <span class="proxy-page__pill-value">{{ totalSuccess }}</span>
          </div>
          <div class="proxy-page__pill proxy-page__pill--danger">
            <span class="proxy-page__pill-label">不可用</span>
            <span class="proxy-page__pill-value">{{ totalFailure }}</span>
          </div>
          <div class="proxy-page__pill">
            <span class="proxy-page__pill-label">刷新</span>
            <span class="proxy-page__pill-value">08:00</span>
          </div>
        </div>

        <div class="proxy-page__actions">
          <p class="proxy-page__hint">公共代理资源有限，大批量抓取建议使用私有代理。</p>
          <UPopover :popper="{ placement: 'left-start', arrow: true }">
            <UButton
              :icon="hasBlocked ? 'i-lucide:annoyed' : 'i-lucide:smile'"
              variant="soft"
              :color="hasBlocked ? 'rose' : 'green'"
            >
              {{ hasBlocked ? '当前 IP 已封禁' : '当前 IP 正常' }}
            </UButton>

            <template #panel>
              <div class="proxy-page__popover">
                <div>
                  <p class="proxy-page__popover-label">当前 IP</p>
                  <code class="font-medium" :class="hasBlocked ? 'text-rose-500' : 'text-green-500'">
                    {{ currentIP }}
                  </code>
                </div>
                <div>
                  <p class="proxy-page__popover-header">
                    <span>封禁列表</span>
                    <span class="text-xs text-gray-500">若存在误伤，请联系开发者</span>
                  </p>
                  <ul class="proxy-page__blocked-list">
                    <li v-for="ip in blockedIPS" :key="ip">
                      <code class="text-rose-500">{{ ip }}</code>
                    </li>
                  </ul>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </header>

      <div class="proxy-page__content">
        <div v-if="loading" class="flex justify-center items-center mt-5">
          <Loader :size="28" class="animate-spin text-slate-500" />
        </div>
        <ProxyMetrics :data="metricsData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next';
import { request } from '#shared/utils/request';
import ProxyMetrics from '~/components/ProxyMetrics.vue';
import { websiteName } from '~/config';
import type { AccountMetric } from '~/types/proxy';

useHead({
  title: `公共代理 | ${websiteName}`,
});

const loading = ref(false);
const metricsData = ref<AccountMetric[]>([]);

const totalSuccess = computed(
  () => metricsData.value.filter(item => item.metric && item.metric.dailyRequests < 100_000).length
);
const totalFailure = computed(
  () => metricsData.value.filter(item => item.metric && item.metric.dailyRequests >= 100_000).length
);

async function getMetricsData() {
  loading.value = true;
  try {
    metricsData.value = await fetch('/api/web/worker/overview-metrics')
      .then(res => res.json())
      .catch(e => {
        throw e;
      });
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

const currentIP = ref('');
const blockedIPS = ref<string[]>([]);

onMounted(async () => {
  await Promise.all([
    getMetricsData(),
    request('/api/web/misc/current-ip').then(data => {
      currentIP.value = data.ip;
    }),
    request<{ ips: string[] } | string[]>('/api/web/worker/blocked-ip-list').then(data => {
      blockedIPS.value = Array.isArray(data) ? data : data.ips || [];
    }),
  ]);
});
const hasBlocked = computed(() => {
  return blockedIPS.value.includes(currentIP.value);
});
</script>

<style scoped>
.proxy-page {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 1rem;
}

.proxy-page__shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.65rem;
}

.proxy-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.75rem 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.proxy-page__toolbar :deep(button) {
  min-height: 2.35rem;
  border-radius: 0.78rem;
}

.proxy-page__stats,
.proxy-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}

.proxy-page__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.42rem 0.6rem;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
}

.proxy-page__pill--danger {
  color: #be123c;
}

.proxy-page__pill-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  opacity: 0.58;
}

.proxy-page__pill-value {
  font-size: 0.84rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.proxy-page__hint {
  color: rgba(15, 23, 42, 0.56);
  font-size: 0.84rem;
  line-height: 1.55;
}

.proxy-page__content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 0.9rem;
  padding: 0.8rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(246, 249, 253, 0.93) 100%);
}

.proxy-page__popover {
  max-height: 20rem;
  min-width: 18rem;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.proxy-page__popover-label,
.proxy-page__popover-header {
  color: rgba(15, 23, 42, 0.62);
  font-size: 0.8rem;
  line-height: 1.5;
}

.proxy-page__popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.proxy-page__blocked-list {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.3rem;
}

@media (max-width: 768px) {
  .proxy-page {
    padding: 0.75rem;
  }

  .proxy-page__toolbar,
  .proxy-page__content {
    padding: 0.72rem;
  }
}
</style>
