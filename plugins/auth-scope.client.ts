import type { GetAuthKeyResult } from '~/types/types';

export default defineNuxtPlugin(async () => {
  const loginAccount = useLoginAccount();
  if (!loginAccount.value || loginAccount.value.scopeId) {
    return;
  }

  try {
    const resp = await $fetch<GetAuthKeyResult>('/api/public/v1/authkey', {
      retry: 0,
      method: 'GET',
    });
    if (resp.code === 0 && resp.data) {
      loginAccount.value = {
        ...loginAccount.value,
        scopeId: resp.data,
      };
    }
  } catch {
    // Ignore hydration failures and let the user re-login if scope is required later.
  }
});
