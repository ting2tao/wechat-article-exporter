import { deleteAllAccountData } from '~/server/services/worker/repository';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = await resolveScopeIdFromRequest(event);

  const body = await readBody<{ fakeids: unknown }>(event);
  if (!body || !Array.isArray(body.fakeids) || body.fakeids.length === 0) {
    return { ok: true };
  }

  const fakeids = body.fakeids as string[];
  await deleteAllAccountData(fakeids, authKey);
  return { ok: true };
});
