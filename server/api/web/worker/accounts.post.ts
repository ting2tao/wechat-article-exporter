import { updateSchedulerConfig, upsertTrackedAccounts } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import type { MpAccount } from '~/store/v2/info';

export default defineEventHandler(async event => {
  const body = await readBody<{ accounts?: MpAccount[] }>(event);
  const accounts = (body.accounts || []).filter(account => account?.fakeid);
  if (accounts.length === 0) {
    return { ok: true };
  }

  await upsertTrackedAccounts(accounts);

  const authKey = getAuthKeyFromRequest(event);
  if (authKey) {
    await updateSchedulerConfig({
      authKey,
      authBoundAt: Date.now(),
    });
  }

  return { ok: true };
});
