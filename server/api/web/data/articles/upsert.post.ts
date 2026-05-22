import type { AppMsgExWithFakeID } from '~/types/types';
import { upsertArticleCacheRecords } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ articles: unknown }>(event);
  if (!body || !Array.isArray(body.articles)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid articles array' });
  }

  const articles = body.articles as AppMsgExWithFakeID[];
  if (articles.length === 0) {
    return { ok: true };
  }

  await upsertArticleCacheRecords(articles, authKey);
  return { ok: true };
});
