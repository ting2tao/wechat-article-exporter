import { updateArticleStatusByLink } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ url: string; status: string }>(event);
  if (!body?.url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  await updateArticleStatusByLink(body.url, body.status || '', authKey);
  return { ok: true };
});
