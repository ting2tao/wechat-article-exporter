<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <p class="setting-card__eyebrow">Proxy</p>
        <h3 class="setting-card__title">代理节点</h3>
        <p class="setting-card__summary">
          若此处留空，则网站将使用
          <ExternalLink :href="docsWebSite + '/get-started/proxy.html'" text="公共代理" />
          进行资源下载。
        </p>
        <p class="setting-card__link">
          <ExternalLink :href="docsWebSite + '/get-started/private-proxy.html'" text="如何搭建代理节点？" />
        </p>
      </div>
    </template>

    <div class="setting-card__split">
      <textarea
        v-model="textareaValue"
        class="setting-card__textarea"
        spellcheck="false"
        placeholder="请填写私有部署的代理地址，一行一个"
      ></textarea>

      <div class="setting-card__panel">
        <div class="setting-card__note">
          <p class="setting-card__note-title">填写要求</p>
          <ol class="setting-card__list">
            <li>以 <code>http/https</code> 开头的绝对路径地址。</li>
            <li>该地址在使用时会自动拼接 <code>?url=</code> 等参数，请确保末尾格式正确。</li>
          </ol>
        </div>

        <div class="setting-card__note">
          <p class="setting-card__note-title">代理示例</p>
          <p><code>https://wproxy-01.deno.dev</code></p>
          <p><code>https://wproxy-01.deno.dev/</code></p>
        </div>

        <UButton type="submit" color="black" class="setting-card__button" @click="save">{{ saveBtnText }}</UButton>
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
  font-size: 1.2rem;
  font-weight: 700;
}

.setting-card__summary,
.setting-card__link {
  color: rgba(15, 23, 42, 0.66);
  font-size: 0.92rem;
  line-height: 1.65;
}

.setting-card__split {
  display: grid;
  gap: 1rem;
}

.setting-card__textarea {
  min-height: 22rem;
  width: 100%;
  resize: vertical;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 1.15rem;
  padding: 1rem;
  background: rgba(248, 247, 243, 0.88);
  color: #111111;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  line-height: 1.65;
  outline: none;
}

.setting-card__textarea:focus {
  border-color: rgba(17, 17, 17, 0.2);
  box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.05);
}

.setting-card__panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.setting-card__note {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.2rem;
  padding: 1rem;
  background: rgba(247, 246, 241, 0.86);
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.7;
}

.setting-card__note-title {
  margin-bottom: 0.35rem;
  color: #111111;
  font-size: 0.94rem;
  font-weight: 600;
}

.setting-card__list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-left: 1.1rem;
}

.setting-card code {
  color: #9f1239;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__button {
  width: 6rem;
  justify-content: center;
}

@media (min-width: 1024px) {
  .setting-card__split {
    grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 1fr);
    align-items: start;
    gap: 1.25rem;
  }
}
</style>
