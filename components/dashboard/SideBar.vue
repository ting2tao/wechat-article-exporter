<script setup lang="ts">
import NavMenus from '~/components/dashboard/NavMenus.vue';
import { websiteName } from '~/config';
</script>

<template>
  <aside class="workspace-sidebar">
    <NuxtLink to="/" class="workspace-sidebar__brand" :aria-label="websiteName">
      <span class="workspace-sidebar__mark">WX</span>
      <span class="workspace-sidebar__logo">文章台</span>
    </NuxtLink>

    <NavMenus />
  </aside>
</template>

<style scoped>
.workspace-sidebar {
  display: flex;
  width: 5.25rem;
  min-height: 100vh;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.65rem;
  border-right: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(180deg, #0f1723 0%, #121a26 100%);
  backdrop-filter: blur(16px);
}

.workspace-sidebar__brand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 1rem;
  padding: 0.8rem 0.65rem;
  background:
    radial-gradient(circle at top, rgba(96, 165, 250, 0.26), transparent 48%),
    linear-gradient(180deg, rgba(15, 23, 35, 0.98) 0%, rgba(13, 19, 29, 0.92) 100%);
  box-shadow:
    0 14px 30px rgba(2, 6, 23, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  text-decoration: none;
}

.workspace-sidebar__brand::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
  background-size: 0.85rem 0.85rem;
  opacity: 0.5;
  pointer-events: none;
  content: '';
}

.workspace-sidebar__mark {
  position: relative;
  z-index: 1;
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.8rem;
  background: rgba(248, 250, 252, 0.06);
  color: #f8fafc;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.workspace-sidebar__logo {
  position: relative;
  z-index: 1;
  display: block;
  color: rgba(241, 245, 249, 0.92);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-family: 'Avenir Next', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

@media (min-width: 1024px) {
  .workspace-sidebar {
    width: 7.5rem;
    gap: 0.8rem;
    padding: 0.8rem;
  }

  .workspace-sidebar__brand {
    padding: 0.95rem 0.8rem;
  }

  .workspace-sidebar__mark {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.9rem;
    font-size: 0.8rem;
  }

  .workspace-sidebar__logo {
    font-size: 0.72rem;
  }
}

@media (max-width: 640px) {
  .workspace-sidebar {
    width: 4.45rem;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .workspace-sidebar__brand {
    padding: 0.68rem 0.4rem;
  }

  .workspace-sidebar__mark {
    width: 2rem;
    height: 2rem;
    border-radius: 0.7rem;
    font-size: 0.7rem;
  }

  .workspace-sidebar__logo {
    font-size: 0.6rem;
  }
}
</style>
