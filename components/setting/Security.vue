<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '#ui/types';
import toastFactory from '~/composables/toast';

interface SecurityFormState {
  currentPassword: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const toast = toastFactory();
const { authState, updateCredentials } = useAppAuth();

const formState = reactive<SecurityFormState>({
  currentPassword: '',
  username: authState.value.username || 'admin',
  password: '',
  confirmPassword: '',
});

const loading = ref(false);

watch(
  () => authState.value.username,
  username => {
    if (username) {
      formState.username = username;
    }
  },
  { immediate: true }
);

function validate(state: SecurityFormState): FormError[] {
  const errors: FormError[] = [];

  if (!state.currentPassword) {
    errors.push({
      path: 'currentPassword',
      message: '请输入当前密码',
    });
  }

  if (!state.username.trim()) {
    errors.push({
      path: 'username',
      message: '请输入新账号',
    });
  }

  if (!state.password) {
    errors.push({
      path: 'password',
      message: '请输入新密码',
    });
  }

  if (state.password.length > 0 && state.password.length < 6) {
    errors.push({
      path: 'password',
      message: '新密码至少 6 位',
    });
  }

  if (state.confirmPassword !== state.password) {
    errors.push({
      path: 'confirmPassword',
      message: '两次输入的新密码不一致',
    });
  }

  return errors;
}

async function submit(event: FormSubmitEvent<SecurityFormState>) {
  if (loading.value) {
    return;
  }

  loading.value = true;

  try {
    await updateCredentials({
      currentPassword: event.data.currentPassword,
      username: event.data.username.trim(),
      password: event.data.password,
    });

    formState.currentPassword = '';
    formState.password = '';
    formState.confirmPassword = '';

    toast.success('账号密码已更新', '下次请使用新的系统账号密码登录');
  } catch (error) {
    toast.error('更新失败', error instanceof Error ? error.message : '请检查当前密码后重试');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <div class="setting-card__header-copy">
          <p class="setting-card__eyebrow">Security</p>
          <h3 class="setting-card__title">系统账号</h3>
        </div>
        <div class="setting-card__badge">{{ authState.username || 'admin' }}</div>
      </div>
    </template>

    <UForm :state="formState" :validate="validate" class="setting-card__form" @submit="submit">
      <UFormGroup label="当前密码" name="currentPassword" required class="setting-card__group">
        <UInput
          v-model="formState.currentPassword"
          type="password"
          placeholder="请输入当前密码"
          autocomplete="current-password"
        />
      </UFormGroup>

      <UFormGroup label="新账号" name="username" required class="setting-card__group">
        <UInput v-model="formState.username" placeholder="请输入新的系统账号" autocomplete="username" />
      </UFormGroup>

      <UFormGroup label="新密码" name="password" required class="setting-card__group">
        <UInput
          v-model="formState.password"
          type="password"
          placeholder="请输入新的系统密码"
          autocomplete="new-password"
        />
      </UFormGroup>

      <UFormGroup label="确认新密码" name="confirmPassword" required class="setting-card__group">
        <UInput
          v-model="formState.confirmPassword"
          type="password"
          placeholder="请再次输入新的系统密码"
          autocomplete="new-password"
        />
      </UFormGroup>

      <UButton type="submit" color="black" size="sm" class="setting-card__submit" :loading="loading">
        保存新的账号密码
      </UButton>
    </UForm>
  </UCard>
</template>

<style scoped>
.setting-card {
  margin: 0;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.95rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.setting-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.setting-card__header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.setting-card__eyebrow {
  color: rgba(15, 23, 42, 0.44);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__title {
  color: #111111;
  font-size: 1.05rem;
  font-weight: 700;
}

.setting-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 999px;
  padding: 0.1rem 0.72rem;
  background: rgba(239, 246, 255, 0.86);
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.setting-card__group :deep(label) {
  font-size: 0.84rem;
  font-weight: 600;
}

.setting-card__group :deep(input) {
  min-height: 2.55rem;
  border-radius: 0.78rem;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
}

.setting-card__submit {
  min-height: 2.45rem;
  width: fit-content;
  border-radius: 0.82rem;
}

@media (min-width: 900px) {
  .setting-card__form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .setting-card__submit {
    grid-column: span 2;
  }
}
</style>
