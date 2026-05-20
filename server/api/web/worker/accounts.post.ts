import { updateSchedulerConfig, upsertTrackedAccounts } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';
import type { MpAccount } from '~/store/v2/info';

export default defineEventHandler(async event => {
  const body = await readBody<{ accounts?: MpAccount[] }>(event);
  const accounts = (body.accounts || []).filter(account => account?.fakeid);
  if (accounts.length === 0) {
    return { ok: true };
  }

  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少公众号登录作用域',
    });
  }

  const scopeId = await resolveScopeIdFromRequest(event);
  await upsertTrackedAccounts(accounts, scopeId);
  await updateSchedulerConfig(
    {
      authKey,
      authBoundAt: Date.now(),
    },
    scopeId
  );

  return { ok: true };
});
