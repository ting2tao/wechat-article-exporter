<template>
  <div class="proxy-metrics">
    <div
      v-for="account in accountMetrics"
      :key="account.name"
      class="proxy-metrics__card"
    >
      <div class="proxy-metrics__head">
        <div>
          <p class="proxy-metrics__eyebrow">节点</p>
          <h3 class="proxy-metrics__title" :title="account.name">{{ account.domain }}</h3>
        </div>
        <div class="proxy-metrics__actions">
          <div class="size-5">
            <UIcon
              v-if="account.fetchAnalyticsLoading"
              name="i-lucide:loader"
              class="size-5 text-slate-400 animate-spin"
            />
            <UTooltip v-else text="节点使用信息">
              <UIcon
                name="i-lucide:activity"
                class="size-5 text-slate-500 hover:text-slate-900 cursor-pointer"
                @click="nodeAnalytics(account)"
              />
            </UTooltip>
          </div>
          <div class="size-5">
            <UIcon
              v-if="account.copied"
              name="i-lucide:check"
              class="size-5 text-slate-500 hover:text-slate-400 cursor-pointer"
            />
            <UTooltip v-else text="复制节点地址">
              <UIcon
                name="i-lucide:copy"
                class="size-5 text-slate-500 hover:text-slate-900 cursor-pointer"
                @click="copyAddress(account)"
              />
            </UTooltip>
          </div>
        </div>
      </div>

      <UMeter v-if="account.metric" :value="account.metric.dailyRequests" :max="100_000" color="blue">
        <template #indicator>
          <div class="proxy-metrics__indicator">
            <span>今日请求量</span>
            <p>
              <span class="proxy-metrics__ratio">
                {{ Math.round((Math.min(account.metric.dailyRequests, 100_000) / 100_000) * 100) }}%
              </span>
              <span class="proxy-metrics__count">
                ({{ account.metric === null ? '未知' : account.metric.dailyRequests.toLocaleString('en-US') }}/{{
                  (100_000).toLocaleString('en-US')
                }})
              </span>
            </p>
          </div>
        </template>
      </UMeter>
      <span v-else class="proxy-metrics__empty">状态未知</span>
      <div class="proxy-metrics__analytics">
        <header class="proxy-metrics__analytics-head">
          <h3 class="proxy-metrics__analytics-title">统计信息</h3>
        </header>
        <div
          v-for="item in account.topClientIPs"
          :key="item.clientIP"
          class="proxy-metrics__analytics-row"
        >
          <div class="proxy-metrics__analytics-track"></div>
          <div
            :style="{ width: account.total ? (item.count / account.total) * 100 + '%' : '0%' }"
            class="proxy-metrics__analytics-bar"
          ></div>
          <p class="proxy-metrics__analytics-ip">{{ item.clientIP }}</p>
          <p class="proxy-metrics__analytics-count">
            {{ item.count > 1000 ? (item.count / 1000).toFixed(2) + 'k' : item.count }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { request } from '#shared/utils/request';
import type { AccountMetric } from '~/types/proxy';

interface Props {
  data: AccountMetric[];
}
interface AccountMetricWithExtra extends AccountMetric {
  copied: boolean;
  fetchAnalyticsLoading: boolean;
  topClientIPs: Security[];
  total: number;
}
interface Security {
  clientIP: string;
  count: number;
}

const props = defineProps<Props>();

const accountMetrics: AccountMetricWithExtra[] = reactive(
  props.data.map((account: AccountMetric) => ({
    ...account,
    copied: false,
    fetchAnalyticsLoading: false,
    topClientIPs: [],
    total: 0,
  }))
);

watch(
  () => props.data,
  () => {
    Object.assign(
      accountMetrics,
      props.data.map((account: AccountMetric) => ({
        ...account,
        copied: false,
        fetchAnalyticsLoading: false,
        topClientIPs: [],
        total: 0,
      }))
    );
  }
);

function copyAddress(account: AccountMetricWithExtra) {
  let result: string[] = [];
  for (let i = 0; i < 16; i++) {
    result.push(`https://${('0' + i).slice(-2)}${account.domain.replace(/^\*/, '')}`);
  }
  navigator.clipboard.writeText(result.join('\n'));

  account.copied = true;
  setTimeout(() => {
    account.copied = false;
  }, 1000);
}

async function nodeAnalytics(account: AccountMetricWithExtra) {
  account.fetchAnalyticsLoading = true;
  const resp = await request('/api/web/worker/security-top-n', {
    method: 'GET',
    query: {
      name: account.name,
    },
  }).finally(() => {
    account.fetchAnalyticsLoading = false;
  });
  account.topClientIPs = resp.topClientIPs;
  account.total = resp.total;
}
</script>

<style scoped>
.proxy-metrics {
  display: grid;
  gap: 0.8rem;
}

@media (min-width: 1200px) {
  .proxy-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.proxy-metrics__card {
  position: relative;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.95rem;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.proxy-metrics__head,
.proxy-metrics__actions,
.proxy-metrics__indicator,
.proxy-metrics__analytics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.proxy-metrics__eyebrow {
  color: rgba(15, 23, 42, 0.44);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.proxy-metrics__title {
  margin-top: 0.2rem;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.proxy-metrics__indicator {
  margin-top: 0.85rem;
  color: rgba(15, 23, 42, 0.54);
  font-size: 0.82rem;
}

.proxy-metrics__ratio,
.proxy-metrics__count,
.proxy-metrics__analytics-ip,
.proxy-metrics__analytics-count {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.proxy-metrics__ratio {
  color: #2563eb;
  font-size: 0.98rem;
  font-weight: 700;
}

.proxy-metrics__count {
  margin-left: 0.35rem;
  color: rgba(15, 23, 42, 0.52);
  font-size: 0.74rem;
}

.proxy-metrics__empty {
  display: inline-flex;
  margin-top: 0.85rem;
  color: rgba(15, 23, 42, 0.52);
  font-size: 0.84rem;
}

.proxy-metrics__analytics {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.proxy-metrics__analytics-title {
  color: rgba(15, 23, 42, 0.58);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.proxy-metrics__analytics-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  overflow: hidden;
  border-radius: 0.72rem;
  padding: 0.5rem 0.65rem;
}

.proxy-metrics__analytics-track,
.proxy-metrics__analytics-bar {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.proxy-metrics__analytics-track {
  background: rgba(226, 232, 240, 0.66);
}

.proxy-metrics__analytics-bar {
  right: auto;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.82) 0%, rgba(59, 130, 246, 0.5) 100%);
}

.proxy-metrics__analytics-ip,
.proxy-metrics__analytics-count {
  position: relative;
  z-index: 1;
  color: #0f172a;
  font-size: 0.76rem;
}
</style>
