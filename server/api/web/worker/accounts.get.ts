import { listTrackedAccounts } from '~/server/services/worker/repository';

export default defineEventHandler(async () => {
  return listTrackedAccounts();
});
