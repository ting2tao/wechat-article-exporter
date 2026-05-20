import { getDebugMeta, getAllDebugEntries, readDebugFile } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { scopeResolver } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    return [];
  }

  const scopeId = (await scopeResolver.resolve(authKey)) || authKey;

  const query = getQuery(event);
  const url = query.url as string;

  if (url) {
    const result = await readDebugFile(url, scopeId);
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Debug entry not found' });
    }
    setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
    setResponseHeader(event, 'X-Fakeid', result.meta.fakeid || '');
    setResponseHeader(event, 'X-Title', encodeURIComponent(result.meta.title || ''));
    setResponseHeader(event, 'X-Type', result.meta.type || '');
    return result.content;
  }

  return getAllDebugEntries(scopeId);
});
