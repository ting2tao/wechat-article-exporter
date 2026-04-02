<template>
  <div class="workspace-shell">
    <div class="workspace-layout">
      <SideBar />

      <div class="workspace-main">
        <header class="workspace-header">
          <div class="workspace-header__intro">
            <p class="workspace-eyebrow">Workspace</p>
            <p class="workspace-kicker">公众号内容采集、整理与导出</p>
          </div>
          <div class="workspace-header__main">
            <div id="title" class="workspace-title"></div>
            <BottomPanel compact />
          </div>
        </header>

        <div class="workspace-stage" :class="{ 'workspace-stage--scrollable': isSettingsPage }">
          <div class="workspace-stage__page" :class="{ 'workspace-stage__page--scrollable': isSettingsPage }">
            <NuxtPage />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BottomPanel from '~/components/dashboard/BottomPanel.vue';
import SideBar from '~/components/dashboard/SideBar.vue';

const route = useRoute();
const isSettingsPage = computed(() => route.path === '/dashboard/settings');
</script>

<style scoped>
.workspace-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(191, 219, 254, 0.28), transparent 24%),
    radial-gradient(circle at bottom right, rgba(251, 191, 36, 0.12), transparent 30%),
    linear-gradient(180deg, #f6f5f1 0%, #f1f2f4 100%);
  color: #111827;
}

.workspace-layout {
  display: flex;
  min-height: 100vh;
}

.workspace-main {
  display: flex;
  min-width: 0;
  min-height: 100vh;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0.75rem 0;
}

.workspace-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.3rem;
  padding: 0.9rem 1rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 246, 241, 0.92) 100%);
  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
}

.workspace-header::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
  background-size: 1rem 1rem;
  opacity: 0.4;
  pointer-events: none;
  content: '';
}

.workspace-header__intro {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  max-width: 22rem;
}

.workspace-eyebrow {
  color: rgba(15, 23, 42, 0.42);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.workspace-kicker {
  color: rgba(15, 23, 42, 0.68);
  font-size: 0.94rem;
  line-height: 1.5;
}

.workspace-title {
  color: #111111;
}

.workspace-header__main {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.workspace-title :deep(h1) {
  color: #111111 !important;
  font-family: 'Segoe UI Variable Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.6rem, 1.8vw, 2rem);
  letter-spacing: -0.03em;
}

.workspace-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 1.4rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 246, 241, 0.92) 100%);
  box-shadow:
    0 20px 44px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.workspace-stage__page {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.workspace-stage--scrollable,
.workspace-stage__page--scrollable {
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .workspace-main {
    gap: 0.9rem;
    padding: 0.9rem 0.9rem 0.9rem 0;
  }

  .workspace-header {
    padding: 1rem 1.15rem;
  }
}

@media (max-width: 880px) {
  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-header__main {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
