<script setup lang="ts">
interface NavItem {
  name: string;
  icon: string;
  href: string;
  shortName: string;
}

const items = ref<NavItem[]>([
  {
    name: '公众号管理',
    shortName: '账号',
    icon: 'i-lucide:users',
    href: '/dashboard/account',
  },
  {
    name: '文章下载',
    shortName: '文章',
    icon: 'i-lucide:file-down',
    href: '/dashboard/article',
  },
  {
    name: '单篇文章',
    shortName: '单篇',
    icon: 'i-lucide:file-text',
    href: '/dashboard/single',
  },
  {
    name: '合集下载',
    shortName: '合集',
    icon: 'i-lucide:library-big',
    href: '/dashboard/album',
  },
  {
    name: '设置',
    shortName: '设置',
    icon: 'i-lucide:settings',
    href: '/dashboard/settings',
  },
]);

const route = useRoute();
</script>

<template>
  <nav class="workspace-nav">
    <ul class="workspace-nav__list">
      <li v-for="item in items" :key="item.name">
        <NuxtLink
          :to="item.href"
          :class="route.path === item.href ? 'workspace-nav__link workspace-nav__link--active' : 'workspace-nav__link'"
          :title="item.name"
        >
          <UIcon :name="item.icon" class="workspace-nav__icon" />
          <span class="workspace-nav__name">{{ item.shortName }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.workspace-nav {
  flex: 1;
  min-height: 0;
}

.workspace-nav__list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.workspace-nav__link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 4.3rem;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 0.95rem;
  padding: 0.72rem 0.45rem;
  color: rgba(226, 232, 240, 0.72);
  background: rgba(248, 250, 252, 0.03);
  text-decoration: none;
  transition:
    transform 180ms ease,
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.workspace-nav__link:hover {
  transform: translateY(-1px);
  color: #f8fafc;
  border-color: rgba(96, 165, 250, 0.2);
  background: rgba(248, 250, 252, 0.06);
  box-shadow:
    0 10px 24px rgba(2, 6, 23, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.workspace-nav__link--active {
  color: #f8fafc;
  border-color: rgba(96, 165, 250, 0.34);
  background:
    linear-gradient(180deg, rgba(20, 28, 40, 0.98) 0%, rgba(13, 19, 29, 0.98) 100%);
  box-shadow:
    0 16px 28px rgba(2, 6, 23, 0.34),
    inset 0 1px 0 rgba(191, 219, 254, 0.12);
}

.workspace-nav__link--active::after {
  position: absolute;
  inset: 0.35rem;
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: inherit;
  content: '';
}

.workspace-nav__icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

.workspace-nav__name {
  color: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

@media (max-width: 640px) {
  .workspace-nav__list {
    gap: 0.45rem;
  }

  .workspace-nav__link {
    min-height: 3.75rem;
    padding: 0.58rem 0.32rem;
  }

  .workspace-nav__name {
    font-size: 0.62rem;
  }
}
</style>
