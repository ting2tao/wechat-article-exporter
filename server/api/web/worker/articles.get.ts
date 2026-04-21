import { listTrackedArticlesByFakeid } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

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

  return listTrackedArticlesByFakeid(fakeid.trim(), authKey);
});
