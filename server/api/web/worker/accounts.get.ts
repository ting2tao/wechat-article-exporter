import { listTrackedAccounts } from '~/server/services/worker/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    return [];
  }

  return listTrackedAccounts(authKey);
});
