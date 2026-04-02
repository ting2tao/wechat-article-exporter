<script setup lang="ts">
const props = defineProps<{
  compact?: boolean;
}>();

interface NavItem {
  name: string;
  icon: string;
  href: string;
  description: string;
}

const items = ref<NavItem[]>([
  { name: '公众号管理', icon: 'i-lucide:users', href: '/dashboard/account', description: '整理账号与同步范围' },
  { name: '文章下载', icon: 'i-lucide:file-down', href: '/dashboard/article', description: '批量抓取与导出文章' },
  { name: '单篇文章', icon: 'i-lucide:file-text', href: '/dashboard/single', description: '按链接补抓单篇内容' },
  { name: '合集下载', icon: 'i-lucide:library-big', href: '/dashboard/album', description: '按合集批量整理内容' },
  { name: '设置', icon: 'i-lucide:settings', href: '/dashboard/settings', description: '代理、导出与系统设置' },
]);

const route = useRoute();
</script>

<template>
  <nav :class="props.compact ? 'workspace-nav workspace-nav--compact' : 'workspace-nav'">
    <ul :class="props.compact ? 'workspace-nav__list workspace-nav__list--compact' : 'workspace-nav__list'">
      <li v-for="item in items" :key="item.name">
        <NuxtLink
          :to="item.href"
          :class="route.path === item.href ? 'workspace-nav__link workspace-nav__link--active' : 'workspace-nav__link'"
        >
          <UIcon :name="item.icon" class="workspace-nav__icon" />
          <div class="workspace-nav__content">
            <p class="workspace-nav__name">{{ item.name }}</p>
            <p v-if="!props.compact" class="workspace-nav__description">{{ item.description }}</p>
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
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  border: 1px solid transparent;
  border-radius: 1.4rem;
  padding: 0.95rem 0.95rem 1rem;
  color: #6d5947;
  text-decoration: none;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease,
    color 180ms ease;
}

.workspace-nav__link:hover {
  transform: translateY(-1px);
  border-color: rgba(120, 98, 76, 0.12);
  background: rgba(255, 250, 243, 0.72);
  box-shadow: 0 18px 30px rgba(83, 59, 39, 0.06);
  color: #33271d;
}

.workspace-nav__link--active {
  border-color: rgba(120, 98, 76, 0.18);
  background:
    linear-gradient(145deg, rgba(255, 251, 244, 0.96), rgba(248, 238, 226, 0.86)),
    rgba(255, 255, 255, 0.8);
  box-shadow:
    0 18px 32px rgba(91, 65, 44, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  color: #2b2118;
}

.workspace-nav__icon {
  margin-top: 0.1rem;
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.workspace-nav__content {
  min-width: 0;
}

.workspace-nav__name {
  font-size: 0.97rem;
  font-weight: 700;
  line-height: 1.3;
}

.workspace-nav__description {
  margin-top: 0.22rem;
  color: #8a7562;
  font-size: 0.8rem;
  line-height: 1.5;
}

.workspace-nav--compact {
  flex: none;
}

.workspace-nav__list--compact {
  flex-direction: row;
  gap: 0.65rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.workspace-nav__list--compact::-webkit-scrollbar {
  display: none;
}

.workspace-nav__list--compact .workspace-nav__link {
  min-width: max-content;
  align-items: center;
  gap: 0.55rem;
  border-radius: 999px;
  padding: 0.72rem 0.95rem;
  white-space: nowrap;
}

.workspace-nav__list--compact .workspace-nav__icon {
  margin-top: 0;
  width: 1rem;
  height: 1rem;
}

.workspace-nav__list--compact .workspace-nav__name {
  font-size: 0.88rem;
}
</style>
