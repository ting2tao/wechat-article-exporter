import { getAppSession } from '~/server/utils/app-auth';

export default defineEventHandler(async event => {
  const session = await getAppSession(event);

  return {
    authenticated: Boolean(session),
    username: session?.username || null,
  };
});
