import { saveResourceFile } from '~/server/services/worker/repository';
import { readMultipartWithValidation } from '~/server/utils/multipart';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const { fields, fileBuffer } = await readMultipartWithValidation(event, ['fakeid', 'url']);

  await saveResourceFile(
    {
      fakeid: fields.fakeid,
      url: fields.url,
      contentType: fields.contentType || 'application/octet-stream',
    },
    fileBuffer,
    authKey
  );

  return { ok: true };
});
