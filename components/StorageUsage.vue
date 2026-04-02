<script setup lang="ts">
const usage = ref('');

async function init() {
  const storageUsage = await navigator.storage.estimate();
  const bytes = storageUsage.usage!;
  if (bytes < 1000) {
    usage.value = `${bytes} B`;
  } else if (bytes < 1000 ** 2) {
    usage.value = `${(bytes / 1000).toFixed(0)} kB`;
  } else if (bytes < 1000 ** 3) {
    usage.value = `${(bytes / 1000 ** 2).toFixed(1)} M`;
  } else {
    usage.value = `${(bytes / 1000 ** 3).toFixed(1)} G`;
  }
}

let timer: number;
onMounted(() => {
  timer = window.setInterval(() => {
    init();
  }, 1000);
});
onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <div class="storage-note">
    <span class="storage-note__label">本地缓存</span>
    <span class="storage-note__value">{{ usage || '--' }}</span>
  </div>
</template>

<style scoped>
.storage-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #6f5c49;
  font-size: 0.82rem;
}

.storage-note__label {
  letter-spacing: 0.04em;
}

.storage-note__value {
  color: #2d241b;
  font-family: 'SFMono-Regular', 'Menlo', 'Monaco', 'Cascadia Mono', monospace;
  font-size: 0.82rem;
  font-weight: 600;
}
</style>
