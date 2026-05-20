<script setup lang="ts">
import { request } from '#shared/utils/request';
import type { LoginAccount, ScanLoginResult, StartLoginResult } from '~/types/types';
import { websiteName } from '~/config';

const qrcodeSrc = ref('');
const loading = ref(false);
const msg = ref('');
const checkTimer = ref<number | null>(null);
const loginAccount = useLoginAccount();
const { refreshSession } = useAppAuth();

onMounted(() => {
  getQrcode();
});

onUnmounted(() => {
  if (checkTimer.value) {
    window.clearTimeout(checkTimer.value);
    checkTimer.value = null;
  }
});

async function newLoginSession() {
  const sid = new Date().getTime().toString() + Math.floor(Math.random() * 100);
  const resp = await request<StartLoginResult>(`/api/web/login/session/${sid}`, { method: 'POST' });
  if (!resp || !resp.base_resp || resp.base_resp.ret !== 0) {
    throw new Error(`${resp?.base_resp?.err_msg || '获取登录会话失败'}`);
  }
}

async function getQrcode() {
  try {
    loading.value = true;
    msg.value = '获取登录二维码';
    await newLoginSession();
    qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`;
    msg.value = '';
    scheduleCheck();
  } catch (e: any) {
    msg.value = e.message;
    qrcodeSrc.value = '';
  } finally {
    loading.value = false;
  }
}

function scheduleCheck() {
  if (checkTimer.value) {
    window.clearTimeout(checkTimer.value);
  }
  checkTimer.value = window.setTimeout(checkQrcodeStatus, 2000);
}

async function checkQrcodeStatus() {
  try {
    const resp = await request<ScanLoginResult>('/api/web/login/scan');
    if (!resp || !resp.base_resp || resp.base_resp.ret !== 0) {
      scheduleCheck();
      return;
    }

    switch (resp.status) {
      case 0:
        scheduleCheck();
        break;
      case 1:
        msg.value = '已确认，正在登录中';
        await bizLogin();
        break;
      case 2:
      case 3:
        qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`;
        scheduleCheck();
        break;
      case 4:
      case 6:
        if (resp.acct_size >= 1) {
          loading.value = true;
          msg.value = '扫码成功，等待确认';
          qrcodeSrc.value = '';
        } else {
          msg.value = '没有可登录账号';
        }
        scheduleCheck();
        break;
      case 5:
        msg.value = '该账号尚未绑定邮箱';
        scheduleCheck();
        break;
    }
  } catch {
    scheduleCheck();
  }
}

async function bizLogin() {
  try {
    loading.value = true;
    const resp = await request<LoginAccount>('/api/web/login/bizlogin', {
      method: 'POST',
    });
    if (resp.err) {
      throw new Error(resp.err);
    }

    loginAccount.value = resp;
    await refreshSession(true);
    msg.value = '登录成功';
    if (checkTimer.value) {
      window.clearTimeout(checkTimer.value);
      checkTimer.value = null;
    }
    await navigateTo('/dashboard/account', { replace: true });
  } catch (e: any) {
    msg.value = e.message;
    loading.value = false;
    // 登录失败后重新获取二维码
    setTimeout(() => getQrcode(), 2000);
  }
}

useHead({
  title: `登录 | ${websiteName}`,
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <UCard class="w-full max-w-md shadow-lg">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900">微信公众号登录</h1>
          <p class="text-sm text-slate-500">
            使用微信扫码登录公众号后台，登录后即可同步和导出文章。
          </p>
        </div>
      </template>

      <div class="flex flex-col items-center gap-4 py-4">
        <div class="flex flex-col justify-center items-center size-72">
          <UIcon v-if="loading && !qrcodeSrc" name="i-lucide:loader" :size="28" class="animate-spin text-slate-500" />
          <p v-if="msg" class="text-sm text-center" :class="msg === '登录成功' ? 'text-green-600' : 'text-rose-500'">
            {{ msg }}
          </p>
          <img v-if="qrcodeSrc" :src="qrcodeSrc" alt="扫码登录" class="w-full rounded-md" />
        </div>

        <UButton
          v-if="msg && !loading"
          variant="soft"
          color="gray"
          size="sm"
          @click="getQrcode"
        >
          刷新二维码
        </UButton>
      </div>
    </UCard>
  </div>
</template>
