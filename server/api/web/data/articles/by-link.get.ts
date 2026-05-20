import { getArticleByLink } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' });
  }

  try {
    return await getArticleByLink(url, authKey);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('does not exist')) {
      throw createError({ statusCode: 404, statusMessage: 'Article not found' });
    }
    throw error;
  }
});
