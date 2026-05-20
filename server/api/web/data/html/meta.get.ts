import { getHtmlMeta } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  const meta = await getHtmlMeta(url, authKey);
  if (!meta) {
    throw createError({ statusCode: 404, statusMessage: 'HTML not found' });
  }

  return {
    fakeid: meta.fakeid,
    url: meta.url,
    title: meta.title,
    commentID: meta.comment_id,
  };
});
