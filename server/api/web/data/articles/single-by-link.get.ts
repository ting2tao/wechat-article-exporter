import { getSingleArticleByLink } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  try {
    return getSingleArticleByLink(url, authKey);
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' });
  }
});
