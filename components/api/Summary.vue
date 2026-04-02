<script setup lang="ts">
import { sleep } from '#shared/utils/helpers';
import { request } from '#shared/utils/request';
import CodeSegment from '~/components/api/CodeSegment.vue';
import toastFactory from '~/composables/toast';
import type { GetAuthKeyResult } from '~/types/types';

const toast = toastFactory();

const loading = ref(false);
const authKey = ref('');
async function getAuthKey() {
  loading.value = true;
  try {
    await sleep(1000);
    const resp = await request<GetAuthKeyResult>(`/api/public/v1/authkey`);
    if (resp.code === 0) {
      authKey.value = resp.data;
    } else {
      toast.error('获取密钥失败', resp.msg);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="api-summary">
    <div class="api-summary__hero">
      <p class="api-summary__copy">
        网站核心能力已经开放为 API，可用于公众号查询、历史文章列表读取、文章下载等接入场景。
      </p>
      <div class="api-summary__tips">
        <span class="api-summary__tip">当前免费接入</span>
        <span class="api-summary__tip api-summary__tip--warn">高频调用建议私有部署</span>
      </div>
    </div>

    <UAlert class="api-summary__alert">
      <template #title>
        <h3 class="api-summary__title">
          <UIcon name="i-lucide:key-square" />
          <span>密钥</span>
        </h3>
      </template>

      <template #description>
        <ol class="api-summary__list">
          <li>
            <p>以下所有 <code>API</code> 如无特殊说明，均需要携带密钥进行调用。密钥可通过以下两种方式传输：</p>
            <p>a. 通过自定义请求头 <code class="text-rose-500 font-medium font-mono">X-Auth-Key</code></p>
            <p>b. 通过 name 为 <code class="text-rose-500 font-medium font-mono">auth-key</code> 的 Cookie</p>
          </li>
          <li>
            <p>
              <span
                >调用 API 的密钥与本网站的登录已集成在一起，也就是说，你在该网站扫码登录之后会自动刷新 API 密钥。</span
              >
            </p>
          </li>
          <li>
            <p>
              <span>由于该密钥与网站用的同一套体系，网站的登录信息失效时，对应的 API 密钥也将失效。</span>
            </p>
          </li>
        </ol>
        <UButton class="api-summary__button" color="black" size="sm" :loading="loading" @click="getAuthKey">
          查询 API 密钥 (确保当前登录信息有效)
        </UButton>
        <div v-if="authKey">
          <p class="api-summary__key-label">当前密钥</p>
          <CodeSegment :code="authKey" lang="text" class="max-w-xl" />
        </div>
      </template>
    </UAlert>
  </div>
</template>

<style scoped>
.api-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-summary__hero {
  display: grid;
  gap: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.95rem;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 255, 0.92) 100%);
}

.api-summary__copy {
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.7;
}

.api-summary__tips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.api-summary__tip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  padding: 0.42rem 0.62rem;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
}

.api-summary__tip--warn {
  color: #be123c;
}

.api-summary__alert {
  margin: 0;
}

.api-summary__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 700;
}

.api-summary__list {
  display: grid;
  gap: 0.75rem;
  padding-left: 1.2rem;
  line-height: 1.65;
}

.api-summary__button {
  margin-top: 0.9rem;
}

.api-summary__key-label {
  margin: 1rem 0 0.5rem;
  color: rgba(15, 23, 42, 0.56);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
