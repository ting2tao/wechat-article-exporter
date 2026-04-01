<script setup lang="ts">
import { formatDistance } from 'date-fns';
import { request } from '#shared/utils/request';
import LoginModal from '~/components/modal/Login.vue';
import StorageUsage from '~/components/StorageUsage.vue';
import toastFactory from '~/composables/toast';
import { IMAGE_PROXY } from '~/config';
import type { LogoutResponse } from '~/types/types';

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
  <footer class="flex flex-col space-y-2 pt-3 border-t dark:border-slate-600">
    <div v-if="loginAccount" class="space-y-3">
      <div class="flex items-center space-x-2">
        <img
          v-if="loginAccount.avatar"
          :src="IMAGE_PROXY + loginAccount.avatar"
          alt=""
          class="rounded-full size-10 ring-1 ring-gray-300"
        />
        <UTooltip
          v-if="loginAccount.nickname"
          class="flex-1 overflow-hidden"
          :popper="{ placement: 'top-start', offsetDistance: 16 }"
        >
          <template #text>
            <span>{{ loginAccount.nickname }}</span>
          </template>
          <span class="whitespace-nowrap text-ellipsis overflow-hidden">{{ loginAccount.nickname }}</span>
        </UTooltip>

        <UButton
          icon="i-heroicons-arrow-left-start-on-rectangle-16-solid"
          :loading="logoutBtnLoading"
          class="bg-slate-10 hover:bg-rose-500 disabled:bg-rose-500"
          @click="logoutMp"
          >退出公众号
        </UButton>
      </div>
      <div class="text-sm">
        <span>登录信息过期时间还剩: </span>
        <span class="font-mono" :class="warning ? 'text-rose-500' : 'text-green-500'">{{ distance }}</span>
      </div>
    </div>
    <div v-else>
      <UButton color="gray" variant="solid" @click="login">登录公众号</UButton>
    </div>

    <div v-if="authState.username" class="border-t dark:border-slate-600 pt-3 space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-500">系统账号</span>
        <span class="font-mono font-medium">{{ authState.username }}</span>
      </div>
      <UButton
        color="gray"
        variant="outline"
        icon="i-lucide:log-out"
        :loading="appLogoutLoading"
        block
        @click="logoutApp"
      >
        退出系统
      </UButton>
    </div>

    <StorageUsage />
  </footer>
</template>
