import { readTrackedArticleHtmlBatch } from '~/server/services/worker/repository';

export default defineEventHandler(async event => {
  const body = await readBody<{ fakeid?: string; aids?: string[] }>(event);
  const fakeid = body.fakeid?.trim();
  if (!fakeid) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 fakeid',
    });
  }

  const aids = (body.aids || []).map(aid => aid?.trim()).filter(Boolean) as string[];
  if (aids.length === 0) {
    return [];
  }

  return readTrackedArticleHtmlBatch(fakeid, aids);
});
