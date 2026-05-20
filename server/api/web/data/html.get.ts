import { readHtmlFile } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  const result = await readHtmlFile(url, authKey);
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'HTML not found' });
  }

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
  setResponseHeader(event, 'X-Fakeid', result.meta.fakeid);
  setResponseHeader(event, 'X-Title', encodeURIComponent(result.meta.title));
  setResponseHeader(event, 'X-Comment-Id', result.meta.comment_id || '');

  return result.content;
});
