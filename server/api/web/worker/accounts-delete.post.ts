import { removeTrackedAccounts } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const body = await readBody<{ fakeids?: string[] }>(event);
  const fakeids = (body.fakeids || []).filter(Boolean);
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少公众号登录作用域',
    });
  }

  const scopeId = await resolveScopeIdFromRequest(event);
  await removeTrackedAccounts(fakeids, scopeId);
  return { ok: true };
});
