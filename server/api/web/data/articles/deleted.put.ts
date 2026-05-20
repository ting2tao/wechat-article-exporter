import { markArticleDeletedByLink } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ url: string; is_deleted: boolean }>(event);
  if (!body?.url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  await markArticleDeletedByLink(body.url, body.is_deleted ?? true, authKey);
  return { ok: true };
});
