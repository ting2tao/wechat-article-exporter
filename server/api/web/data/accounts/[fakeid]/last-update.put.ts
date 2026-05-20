import { updateAccountLastUpdateTime } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const fakeid = getRouterParam(event, 'fakeid');
  if (!fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fakeid' });
  }

  await updateAccountLastUpdateTime(fakeid, authKey);
  return { ok: true };
});
