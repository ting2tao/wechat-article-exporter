<template>
  <div class="workspace-shell">
    <div class="workspace-shell__glow workspace-shell__glow--left"></div>
    <div class="workspace-shell__glow workspace-shell__glow--right"></div>

    <div class="workspace-layout">
      <SideBar />

      <div class="workspace-main">
        <div class="workspace-mobile-nav">
          <NavMenus compact />
        </div>

        <header class="workspace-header">
          <p class="workspace-eyebrow">WeChat Archive Desk</p>
          <div id="title" class="workspace-title"></div>
          <p class="workspace-copy">只保留抓取、整理与导出的主路径，让工作台更安静，也更顺手。</p>
        </header>

        <div class="workspace-stage">
          <NuxtPage />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavMenus from '~/components/dashboard/NavMenus.vue';
import SideBar from '~/components/dashboard/SideBar.vue';
</script>

<style scoped>
.workspace-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(245, 208, 92, 0.18), transparent 26%),
    radial-gradient(circle at top right, rgba(125, 92, 61, 0.12), transparent 28%),
    linear-gradient(180deg, #f8f4ec 0%, #f3eee5 48%, #efe7db 100%);
}

.workspace-shell__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.7;
  pointer-events: none;
}

.workspace-shell__glow--left {
  top: -5rem;
  left: -4rem;
  width: 16rem;
  height: 16rem;
  background: rgba(114, 92, 73, 0.14);
}

.workspace-shell__glow--right {
  right: -6rem;
  bottom: 10%;
  width: 18rem;
  height: 18rem;
  background: rgba(222, 173, 108, 0.2);
}

.workspace-layout {
  position: relative;
  display: flex;
  min-height: 100vh;
}

.workspace-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.workspace-mobile-nav {
  display: block;
}

.workspace-header {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(120, 98, 76, 0.16);
  border-radius: 1.75rem;
  padding: 1.15rem 1.35rem 1.25rem;
  background: rgba(255, 252, 246, 0.82);
  box-shadow:
    0 28px 60px rgba(83, 59, 39, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
}

.workspace-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.45), transparent 40%),
    repeating-linear-gradient(
      90deg,
      rgba(120, 98, 76, 0.03) 0,
      rgba(120, 98, 76, 0.03) 1px,
      transparent 1px,
      transparent 12px
    );
  pointer-events: none;
}

.workspace-eyebrow {
  position: relative;
  margin-bottom: 0.55rem;
  color: #7c6650;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.workspace-title {
  position: relative;
  z-index: 1;
}

.workspace-copy {
  position: relative;
  z-index: 1;
  margin-top: 0.55rem;
  max-width: 44rem;
  color: #6c5b4c;
  font-size: 0.92rem;
  line-height: 1.6;
}

.workspace-stage {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid rgba(120, 98, 76, 0.12);
  border-radius: 1.75rem;
  background: rgba(255, 253, 249, 0.92);
  box-shadow:
    0 24px 50px rgba(89, 63, 44, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
}

@media (min-width: 1024px) {
  .workspace-main {
    gap: 1.25rem;
    padding: 1.25rem;
  }

  .workspace-mobile-nav {
    display: none;
  }

  .workspace-header {
    padding: 1.35rem 1.6rem 1.45rem;
  }
}
</style>
