<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Proxy</p>
        <h3 class="setting-card__title">代理节点</h3>
      </div>
    </template>

    <div class="setting-card__stack">
      <textarea
        v-model="textareaValue"
        class="setting-card__textarea"
        spellcheck="false"
        placeholder="请填写私有部署的代理地址，一行一个"
      ></textarea>

      <div class="setting-card__footer">
        <div class="setting-card__links">
          <ExternalLink :href="docsWebSite + '/get-started/proxy.html'" text="公共代理" />
          <span>·</span>
          <ExternalLink :href="docsWebSite + '/get-started/private-proxy.html'" text="私有部署" />
        </div>

        <div class="setting-card__examples">
          <p><code>https://wproxy-01.deno.dev</code></p>
          <p><code>https://wproxy-01.deno.dev/</code></p>
        </div>
        <UButton type="submit" color="black" size="sm" class="setting-card__button" @click="save">{{ saveBtnText }}</UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import ExternalLink from '~/components/base/ExternalLink.vue';
import { docsWebSite } from '~/config';
import type { Preferences } from '~/types/preferences';

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

const textareaValue = ref('');
const proxyList = computed(() => {
  return textareaValue.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.startsWith('http'));
});

onMounted(() => {
  try {
    const configuredProxyList = (preferences.value as Preferences).privateProxyList;
    if (configuredProxyList.length > 0) {
      textareaValue.value = configuredProxyList.join('\n');
    }
  } catch (e) {}
});

const saveBtnText = ref('保存');
async function save() {
  saveBtnText.value = '保存成功';
  setTimeout(() => {
    (preferences.value as Preferences).privateProxyList = proxyList.value;
    saveBtnText.value = '保存';
  }, 1000);
}
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
  gap: 0.75rem;
}

.setting-card__textarea {
  min-height: 16rem;
  width: 100%;
  resize: vertical;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.9rem;
  padding: 0.9rem 0.95rem;
  background: rgba(248, 251, 255, 0.78);
  color: #111111;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  outline: none;
}

.setting-card__textarea:focus {
  border-color: rgba(17, 17, 17, 0.2);
  box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.05);
}

.setting-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.setting-card__links,
.setting-card__examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: rgba(15, 23, 42, 0.7);
  font-size: 0.78rem;
  line-height: 1.5;
}

.setting-card__links {
  align-items: center;
}

.setting-card__examples p {
  margin: 0;
}

.setting-card code {
  color: #2563eb;
  border-radius: 999px;
  padding: 0.18rem 0.42rem;
  background: rgba(239, 246, 255, 0.9);
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__button {
  min-height: 2.35rem;
  width: 5.6rem;
  justify-content: center;
}
</style>
