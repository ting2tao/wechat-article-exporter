import { createError, defineEventHandler } from 'h3';
import { getAppSession } from '~/server/utils/app-auth';

const PUBLIC_API_PATHS = new Set(['/api/app/auth/login', '/api/app/auth/logout', '/api/app/auth/session']);

export default defineEventHandler(async event => {
  const path = event.path;

  if (PUBLIC_API_PATHS.has(path)) {
    return;
  }

  if (!path.startsWith('/api/web/') && path !== '/api/_debug') {
    return;
  }

  const session = await getAppSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录系统',
    });
  }
});
