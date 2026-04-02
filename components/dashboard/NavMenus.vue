<script setup lang="ts">
interface NavItem {
  name: string;
  icon: string;
  href: string;
  shortName: string;
  description: string;
}

const items = ref<NavItem[]>([
  {
    name: '公众号管理',
    shortName: '账号',
    icon: 'i-lucide:users',
    href: '/dashboard/account',
    description: '整理账号与同步范围',
  },
  {
    name: '文章下载',
    shortName: '文章',
    icon: 'i-lucide:file-down',
    href: '/dashboard/article',
    description: '批量抓取与导出文章',
  },
  {
    name: '单篇文章',
    shortName: '单篇',
    icon: 'i-lucide:file-text',
    href: '/dashboard/single',
    description: '按链接补抓单篇内容',
  },
  {
    name: '合集下载',
    shortName: '合集',
    icon: 'i-lucide:library-big',
    href: '/dashboard/album',
    description: '按合集批量整理内容',
  },
  {
    name: '设置',
    shortName: '设置',
    icon: 'i-lucide:settings',
    href: '/dashboard/settings',
    description: '代理、导出与系统设置',
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
        >
          <UIcon :name="item.icon" class="workspace-nav__icon" />
          <div class="workspace-nav__content">
            <p class="workspace-nav__name">{{ item.name }}</p>
            <p class="workspace-nav__short">{{ item.shortName }}</p>
            <p class="workspace-nav__description">{{ item.description }}</p>
          </div>
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
  gap: 0.7rem;
}

.workspace-nav__link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.65rem;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 1.1rem;
  padding: 0.82rem 0.75rem;
  color: rgba(15, 23, 42, 0.68);
  background: rgba(255, 255, 255, 0.3);
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
  color: #111827;
  border-color: rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.workspace-nav__link--active {
  color: #ffffff;
  border-color: #111827;
  background:
    linear-gradient(180deg, #191919 0%, #111111 100%);
  box-shadow: 0 14px 28px rgba(17, 24, 39, 0.16);
}

.workspace-nav__link--active::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  content: '';
}

.workspace-nav__icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.workspace-nav__content {
  display: none;
}

.workspace-nav__name,
.workspace-nav__description {
  display: none;
}

.workspace-nav__short {
  color: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

@media (min-width: 1024px) {
  .workspace-nav__link {
    justify-content: flex-start;
    gap: 0.82rem;
    min-height: 4rem;
    padding: 0.9rem 0.95rem 0.9rem 1rem;
  }

  .workspace-nav__content {
    display: block;
    min-width: 0;
  }

  .workspace-nav__short {
    display: none;
  }

  .workspace-nav__name {
    display: block;
    color: inherit;
    font-size: 0.96rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .workspace-nav__description {
    display: block;
    margin-top: 0.22rem;
    color: inherit;
    opacity: 0.66;
    font-size: 0.8rem;
    line-height: 1.5;
  }
}
</style>
