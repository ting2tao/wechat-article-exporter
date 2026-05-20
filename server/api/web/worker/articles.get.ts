import { listTrackedArticlesByFakeid } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const fakeid = getQuery(event).fakeid;
  if (typeof fakeid !== 'string' || !fakeid.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 fakeid',
    });
  }

  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    return [];
  }

  const scopeId = await resolveScopeIdFromRequest(event);
  return listTrackedArticlesByFakeid(fakeid.trim(), scopeId);
});
