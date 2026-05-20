import { replaceAllAccountInfo } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';
import type { MpAccount } from '~/store/v2/info';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ accounts: MpAccount[] }>(event);
  const accounts = body?.accounts || [];

  await replaceAllAccountInfo(accounts, authKey);
  return { ok: true };
});
