<script setup lang="ts">
import NavMenus from '~/components/dashboard/NavMenus.vue';
import { websiteName } from '~/config';
</script>

<template>
  <aside class="workspace-sidebar">
    <div class="workspace-sidebar__brand">
      <NuxtLink to="/" class="workspace-sidebar__logo">{{ websiteName }}</NuxtLink>
      <p class="workspace-sidebar__tagline">采集、整理、导出微信公众号文章。</p>
    </div>

    <NavMenus />
  </aside>
</template>

<style scoped>
.workspace-sidebar {
  display: flex;
  width: 5.45rem;
  min-height: 100vh;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border-right: 1px solid rgba(15, 23, 42, 0.06);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(246, 244, 238, 0.76) 100%);
  backdrop-filter: blur(16px);
}

.workspace-sidebar__brand {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.25rem;
  padding: 0.95rem 0.85rem;
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.28), transparent 32%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 243, 235, 0.9) 100%);
  box-shadow:
    0 12px 26px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.workspace-sidebar__brand::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
  background-size: 0.9rem 0.9rem;
  opacity: 0.35;
  pointer-events: none;
  content: '';
}

.workspace-sidebar__logo {
  position: relative;
  z-index: 1;
  display: block;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;
  word-break: break-all;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.workspace-sidebar__tagline {
  display: none;
}

@media (min-width: 1024px) {
  .workspace-sidebar {
    width: 18.6rem;
    gap: 0.9rem;
    padding: 0.9rem;
  }

  .workspace-sidebar__brand {
    padding: 1rem;
  }

  .workspace-sidebar__logo {
    font-size: 1.2rem;
    line-height: 1.35;
    word-break: normal;
  }

  .workspace-sidebar__tagline {
    display: block;
    position: relative;
    z-index: 1;
    margin-top: 0.45rem;
    color: rgba(15, 23, 42, 0.52);
    font-size: 0.84rem;
    line-height: 1.6;
  }
}
</style>
