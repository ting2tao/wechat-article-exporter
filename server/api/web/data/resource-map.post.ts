import { saveResourceMap } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ fakeid: string; url: string; resources: unknown }>(event);
  if (!body?.url || !body?.fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fakeid or url' });
  }

  if (!Array.isArray(body.resources)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid resources array' });
  }

  await saveResourceMap(
    {
      fakeid: body.fakeid,
      url: body.url,
      resources: body.resources as string[],
    },
    authKey
  );

  return { ok: true };
});
