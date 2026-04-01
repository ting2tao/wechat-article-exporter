<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '#ui/types';
import toastFactory from '~/composables/toast';
import { websiteName } from '~/config';

interface LoginFormState {
  username: string;
  password: string;
}

const route = useRoute();
const toast = toastFactory();
const { login } = useAppAuth();

const formState = reactive<LoginFormState>({
  username: 'admin',
  password: '121212',
});

const loading = ref(false);

useHead({
  title: `系统登录 | ${websiteName}`,
});

function validate(state: LoginFormState): FormError[] {
  const errors: FormError[] = [];

  if (!state.username.trim()) {
    errors.push({
      path: 'username',
      message: '请输入账号',
    });
  }

  if (!state.password) {
    errors.push({
      path: 'password',
      message: '请输入密码',
    });
  }

  return errors;
}

async function submit(event: FormSubmitEvent<LoginFormState>) {
  if (loading.value) {
    return;
  }

  loading.value = true;

  try {
    await login({
      username: event.data.username.trim(),
      password: event.data.password,
    });

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard/account';
    await navigateTo(redirect);
  } catch (error) {
    toast.error('登录失败', error instanceof Error ? error.message : '账号或密码错误');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <UCard class="w-full max-w-md shadow-lg">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900">系统登录</h1>
          <p class="text-sm text-slate-500">
            默认账号密码为 <span class="font-mono font-medium">admin / 121212</span>，登录后可在设置页修改。
          </p>
        </div>
      </template>

      <UForm :state="formState" :validate="validate" class="space-y-4" @submit="submit">
        <UFormGroup label="账号" name="username" required>
          <UInput v-model="formState.username" placeholder="请输入账号" autocomplete="username" />
        </UFormGroup>

        <UFormGroup label="密码" name="password" required>
          <UInput
            v-model="formState.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </UFormGroup>

        <UButton type="submit" block color="black" :loading="loading">登录系统</UButton>
      </UForm>
    </UCard>
  </div>
</template>
