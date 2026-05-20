import { updateArticleFakeidByLink } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ url: string; fakeid: string }>(event);
  if (!body?.url || !body?.fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url or fakeid' });
  }

  await updateArticleFakeidByLink(body.url, body.fakeid, authKey);
  return { ok: true };
});
