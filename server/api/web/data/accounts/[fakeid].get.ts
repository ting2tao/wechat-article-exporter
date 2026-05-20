import { getAccountInfo } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const fakeid = getRouterParam(event, 'fakeid');
  if (!fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fakeid' });
  }

  const info = await getAccountInfo(fakeid, authKey);
  if (!info) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' });
  }

  return info;
});
