import { removeTrackedAccounts } from '~/server/services/worker/repository';

export default defineEventHandler(async event => {
  const body = await readBody<{ fakeids?: string[] }>(event);
  const fakeids = (body.fakeids || []).filter(Boolean);
  await removeTrackedAccounts(fakeids);
  return { ok: true };
});
