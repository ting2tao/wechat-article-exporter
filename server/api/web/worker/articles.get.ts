import { listTrackedArticlesByFakeid } from '~/server/services/worker/repository';

export default defineEventHandler(async event => {
  const fakeid = getQuery(event).fakeid;
  if (typeof fakeid !== 'string' || !fakeid.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 fakeid',
    });
  }

  return listTrackedArticlesByFakeid(fakeid.trim());
});
