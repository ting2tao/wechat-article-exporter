<script setup lang="ts">
import BottomPanel from '~/components/dashboard/BottomPanel.vue';
import NavMenus from '~/components/dashboard/NavMenus.vue';
import { websiteName } from '~/config';
</script>

<template>
  <aside class="workspace-sidebar">
    <div class="workspace-sidebar__brand">
      <NuxtLink to="/" class="workspace-sidebar__logo">{{ websiteName }}</NuxtLink>
      <p class="workspace-sidebar__tagline">一个专注于抓取、归档与导出的安静工作台。</p>
    </div>

    <NavMenus />

    <BottomPanel />
  </aside>
</template>

<style scoped>
.workspace-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .workspace-sidebar {
    display: flex;
    width: 19rem;
    min-height: 100vh;
    flex-shrink: 0;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.25rem 0 1.25rem 1.25rem;
  }
}

.workspace-sidebar__brand {
  border: 1px solid rgba(120, 98, 76, 0.16);
  border-radius: 1.75rem;
  padding: 1.35rem 1.2rem;
  background:
    linear-gradient(145deg, rgba(255, 252, 246, 0.92), rgba(248, 241, 232, 0.82)),
    rgba(255, 255, 255, 0.6);
  box-shadow:
    0 28px 60px rgba(83, 59, 39, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.workspace-sidebar__logo {
  display: inline-block;
  color: #2b2118;
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.02em;
  text-decoration: none;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Songti SC', 'STSong', serif;
}

.workspace-sidebar__tagline {
  margin-top: 0.7rem;
  color: #725d4d;
  font-size: 0.9rem;
  line-height: 1.7;
}
</style>
