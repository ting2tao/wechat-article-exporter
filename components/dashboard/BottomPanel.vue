<script setup lang="ts">
import { formatDistance } from 'date-fns';
import { request } from '#shared/utils/request';
import LoginModal from '~/components/modal/Login.vue';
import StorageUsage from '~/components/StorageUsage.vue';
import toastFactory from '~/composables/toast';
import { IMAGE_PROXY } from '~/config';
import type { LogoutResponse } from '~/types/types';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  }
);

const loginAccount = useLoginAccount();
const modal = useModal();
const toast = toastFactory();
const { authState, logout: logoutAppAuth } = useAppAuth();

const now = ref(new Date());
const distance = computed(() => {
  return (
    loginAccount.value &&
    formatDistance(new Date(loginAccount.value.expires), now.value, {
      includeSeconds: true,
      locale: {
        formatDistance: function (token, count, options) {
          if (now.value >= new Date(loginAccount.value.expires)) {
            window.clearInterval(timer);
            setTimeout(() => {
              loginAccount.value = null;
            }, 0);
            return '已过期';
          }

          switch (token) {
            case 'aboutXHours':
              return '大约' + count + '个小时';
            case 'aboutXMonths':
              return '大约' + count + '个月';
            case 'aboutXWeeks':
              return '大约' + count + '周';
            case 'aboutXYears':
              return '大约' + count + '年';
            case 'lessThanXMinutes':
              return '小于' + count + '分钟';
            case 'almostXYears':
              return '接近' + count + '年';
            case 'halfAMinute':
              return '半分钟';
            case 'lessThanXSeconds':
              return '小于' + count + '秒';
            case 'overXYears':
              return '超过' + count + '年';
            case 'xDays':
              return count + '天';
            case 'xHours':
              return count + '个小时';
            case 'xMinutes':
              return count + '分钟';
            case 'xMonths':
              return count + '个月';
            case 'xSeconds':
              return count + '秒';
            case 'xWeeks':
              return count + '周';
            case 'xYears':
              return count + '年';
            default:
              return 'unknown';
          }
        },
      },
    })
  );
});
const warning = computed(() => {
  const value = distance.value;
  return value === '已过期' || value.includes('分钟') || value.includes('秒');
});

function login() {
  modal.open(LoginModal);
}

const logoutBtnLoading = ref(false);
const appLogoutLoading = ref(false);

async function logoutMp() {
  if (logoutBtnLoading.value) {
    return;
  }

  logoutBtnLoading.value = true;

  try {
    const { statusCode, statusText } = await request<LogoutResponse>('/api/web/mp/logout');
    if (statusCode !== 200) {
      alert(statusText);
      return;
    }
  } catch (error) {
    console.error('退出登录失败:', error);
  } finally {
    loginAccount.value = null;
    logoutBtnLoading.value = false;
  }
}

async function logoutApp() {
  if (appLogoutLoading.value) {
    return;
  }

  appLogoutLoading.value = true;

  try {
    await logoutAppAuth();
    await navigateTo('/login');
  } catch (error) {
    toast.error('退出系统失败', error instanceof Error ? error.message : '请稍后重试');
  } finally {
    appLogoutLoading.value = false;
  }
}

let timer: number;
onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});
onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <div v-if="props.compact" class="workspace-top-status">
    <div class="workspace-top-status__item">
      <template v-if="loginAccount">
        <div class="workspace-top-status__account">
          <div class="workspace-top-status__avatar">
            <img v-if="loginAccount.avatar" :src="IMAGE_PROXY + loginAccount.avatar" alt="" class="size-7 rounded-full object-cover" />
            <span v-else class="workspace-top-status__avatar-fallback">{{ loginAccount.nickname?.slice(0, 1) || '微' }}</span>
          </div>
          <div class="workspace-top-status__meta">
            <span class="workspace-top-status__name">{{ loginAccount.nickname || '公众号已登录' }}</span>
            <span class="workspace-top-status__subtle" :class="warning ? 'text-rose-500' : ''">{{ distance }}</span>
          </div>
        </div>
        <UButton
          icon="i-heroicons-arrow-left-start-on-rectangle-16-solid"
          :loading="logoutBtnLoading"
          color="gray"
          variant="ghost"
          square
          @click="logoutMp"
        />
      </template>
      <template v-else>
        <span class="workspace-top-status__subtle">公众号未登录</span>
        <UButton color="black" size="xs" class="workspace-top-status__login-button" @click="login">登录公众号</UButton>
      </template>
    </div>

    <div v-if="authState.username" class="workspace-top-status__item">
      <div class="workspace-top-status__meta">
        <span class="workspace-top-status__name">{{ authState.username }}</span>
        <span class="workspace-top-status__subtle">系统已登录</span>
      </div>
      <UButton icon="i-lucide:log-out" :loading="appLogoutLoading" color="gray" variant="ghost" square @click="logoutApp" />
    </div>

    <div class="workspace-top-status__storage">
      <StorageUsage />
    </div>
  </div>

  <footer v-else class="workspace-status">
    <div class="workspace-status__card">
      <div class="workspace-status__label">公众号会话</div>

      <div v-if="loginAccount" class="space-y-3">
        <div class="flex items-center space-x-3">
          <div class="workspace-status__avatar">
            <img
              v-if="loginAccount.avatar"
              :src="IMAGE_PROXY + loginAccount.avatar"
              alt=""
              class="rounded-full size-11 object-cover"
            />
            <span v-else class="workspace-status__avatar-fallback">{{ loginAccount.nickname?.slice(0, 1) || '微' }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <UTooltip
              v-if="loginAccount.nickname"
              class="flex-1 overflow-hidden"
              :popper="{ placement: 'top-start', offsetDistance: 16 }"
            >
              <template #text>
                <span>{{ loginAccount.nickname }}</span>
              </template>
              <div class="workspace-status__nickname">{{ loginAccount.nickname }}</div>
            </UTooltip>
            <div class="workspace-status__hint">扫码登录后可持续同步与抓取内容</div>
          </div>

          <UButton
            icon="i-heroicons-arrow-left-start-on-rectangle-16-solid"
            :loading="logoutBtnLoading"
            class="workspace-status__button workspace-status__button--ghost"
            @click="logoutMp"
          >
            退出
          </UButton>
        </div>

        <div class="workspace-status__meta">
          <span>剩余有效期</span>
          <span class="font-mono" :class="warning ? 'text-rose-500' : 'text-emerald-700'">{{ distance }}</span>
        </div>
      </div>

      <div v-else class="space-y-3">
        <p class="workspace-status__hint">尚未连接公众号账号，登录后即可同步文章与合集。</p>
        <div class="workspace-status__avatar workspace-status__avatar--square">
          <span class="workspace-status__avatar-fallback">微</span>
        </div>
        <UButton color="black" class="workspace-status__button" @click="login">登录公众号</UButton>
      </div>
    </div>

    <div v-if="authState.username" class="workspace-status__card">
      <div class="workspace-status__label">系统登录</div>
      <div class="workspace-status__meta">
        <span>当前账号</span>
        <span class="font-mono font-medium text-[#2d241b]">{{ authState.username }}</span>
      </div>
      <UButton
        color="gray"
        variant="outline"
        icon="i-lucide:log-out"
        :loading="appLogoutLoading"
        block
        class="workspace-status__button workspace-status__button--outline"
        @click="logoutApp"
      >
        退出系统
      </UButton>
    </div>

    <div class="workspace-status__card workspace-status__card--quiet">
      <StorageUsage />
    </div>
  </footer>
</template>

<style scoped>
.workspace-top-status {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.workspace-top-status__item,
.workspace-top-status__storage {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.3rem;
  max-width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.28rem 0.4rem 0.28rem 0.62rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
}

.workspace-top-status__account {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.workspace-top-status__avatar {
  display: flex;
  width: 1.65rem;
  height: 1.65rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
}

.workspace-top-status__avatar-fallback {
  color: #111827;
  font-size: 0.82rem;
  font-weight: 700;
}

.workspace-top-status__meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.02rem;
}

.workspace-top-status__name {
  overflow: hidden;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-top-status__subtle {
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.68rem;
  line-height: 1.2;
}

.workspace-top-status__login-button {
  white-space: nowrap;
}

.workspace-status {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.workspace-status__card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.workspace-status__card--quiet {
  padding-block: 0.85rem;
}

.workspace-status__label {
  margin-bottom: 0.75rem;
  color: rgba(15, 23, 42, 0.42);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.workspace-status__avatar {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
}

.workspace-status__avatar--square {
  border-radius: 1rem;
}

.workspace-status__avatar-fallback {
  color: #111827;
  font-size: 1rem;
  font-weight: 700;
}

.workspace-status__nickname {
  overflow: hidden;
  color: #111827;
  font-size: 0.98rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-status__hint {
  color: rgba(15, 23, 42, 0.52);
  font-size: 0.8rem;
  line-height: 1.55;
}

.workspace-status__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  color: rgba(15, 23, 42, 0.58);
  font-size: 0.83rem;
}

.workspace-status__button {
  border-radius: 999px;
}

.workspace-status__button--ghost {
  background: rgba(15, 23, 42, 0.04);
  color: #111111;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.workspace-status__button--ghost:hover {
  background: rgba(15, 23, 42, 0.08);
}

.workspace-status__button--outline {
  margin-top: 0.75rem;
  border-color: rgba(15, 23, 42, 0.12);
  background: rgba(15, 23, 42, 0.02);
}

@media (max-width: 880px) {
  .workspace-top-status {
    width: 100%;
    justify-content: flex-start;
  }

  .workspace-top-status__item,
  .workspace-top-status__storage {
    width: 100%;
    justify-content: space-between;
    border-radius: 0.95rem;
  }
}
</style>
