import { updateAccountInfo } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';
import type { MpAccount } from '~/store/v2/info';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ accounts: MpAccount[] }>(event);
  const accounts = body?.accounts || [];
  if (accounts.length === 0) {
    return { ok: true };
  }

  for (const account of accounts) {
    await updateAccountInfo(account, authKey);
  }

  return { ok: true };
});
