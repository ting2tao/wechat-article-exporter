import { deleteArticleById, deleteHtmlFile } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const query = getQuery(event);
  const fakeid = query.fakeid as string;
  const aid = query.aid as string;
  const url = query.url as string;

  if (!fakeid || !aid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fakeid or aid' });
  }

  const articleId = `${fakeid}:${aid}`;
  await deleteArticleById(articleId, authKey);

  if (url) {
    await deleteHtmlFile(url, authKey);
  }

  return { ok: true };
});
