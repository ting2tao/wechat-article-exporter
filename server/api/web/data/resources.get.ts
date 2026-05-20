import { readResourceFile } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  const result = await readResourceFile(url, authKey);
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' });
  }

  setResponseHeader(event, 'Content-Type', result.meta.content_type || 'application/octet-stream');
  setResponseHeader(event, 'X-Fakeid', result.meta.fakeid || '');
  return result.content;
});
