import { saveDebugFile } from '~/server/services/worker/repository';
import { readMultipartWithValidation } from '~/server/utils/multipart';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const { fields, fileBuffer } = await readMultipartWithValidation(event, ['fakeid', 'url']);

  await saveDebugFile(
    {
      fakeid: fields.fakeid,
      url: fields.url,
      type: fields.type || '',
      title: fields.title || '',
    },
    fileBuffer,
    authKey
  );

  return { ok: true };
});
