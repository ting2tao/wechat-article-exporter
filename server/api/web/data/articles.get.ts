import { getArticleCache } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { scopeResolver } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    return [];
  }

  const scopeId = (await scopeResolver.resolve(authKey)) || authKey;

  const query = getQuery(event);
  const fakeid = query.fakeid as string;
  const before = Number(query.before) || Date.now();

  if (!fakeid) {
    return [];
  }

  return getArticleCache(fakeid, before, scopeId);
});
