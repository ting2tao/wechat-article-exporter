import { removeTrackedAccounts } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

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

  await removeTrackedAccounts(fakeids, authKey);
  return { ok: true };
});
