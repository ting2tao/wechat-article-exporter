<template>
  <div class="workspace-shell">
    <div class="workspace-layout">
      <SideBar />

      <div class="workspace-main">
        <header class="workspace-header">
          <div class="workspace-header__title">
            <span class="workspace-header__eyebrow">WX Console</span>
            <div id="title" class="workspace-title"></div>
          </div>
          <div class="workspace-header__status">
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
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 24%),
    radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.12), transparent 28%),
    linear-gradient(180deg, #f3f6fb 0%, #edf2f8 100%);
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
  gap: 0.65rem;
  padding: 0.65rem 0.65rem 0.65rem 0;
}

.workspace-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  padding: 0.7rem 0.85rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow:
    0 10px 28px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
}

.workspace-header::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
  background-size: 1.1rem 1.1rem;
  opacity: 0.34;
  pointer-events: none;
  content: '';
}

.workspace-header__title {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.2rem;
}

.workspace-header__eyebrow {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.22rem 0.5rem;
  background: rgba(255, 255, 255, 0.82);
  color: rgba(15, 23, 42, 0.54);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.workspace-title {
  min-width: 0;
  color: #111111;
}

.workspace-header__status {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.workspace-title :deep(h1) {
  color: #111111 !important;
  font-family: 'Avenir Next', 'Segoe UI Variable Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.2rem, 1.4vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1.05;
}

.workspace-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 1rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(246, 249, 253, 0.93) 100%);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.06),
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
    gap: 0.8rem;
    padding: 0.8rem 0.8rem 0.8rem 0;
  }

  .workspace-header {
    padding: 0.75rem 0.95rem;
  }
}

@media (max-width: 880px) {
  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-header__status {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .workspace-main {
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0;
  }

  .workspace-header,
  .workspace-stage {
    border-radius: 0.85rem;
  }

  .workspace-header {
    padding: 0.65rem 0.75rem;
  }
}
</style>
