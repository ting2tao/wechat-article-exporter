import { clearAppSession, getAppSession } from '~/server/utils/app-auth';

export default defineEventHandler(async event => {
  const session = await getAppSession(event);
  await clearAppSession(event);

  return {
    authenticated: false,
    username: session?.username || null,
  };
});
