import { deleteCookie, parseCookies } from 'h3';
import { cookieStore } from '~/server/utils/CookieStore';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { scopeResolver } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);

  if (authKey) {
    await cookieStore.removeCookie(authKey);
    await scopeResolver.unbind(authKey);
  }

  // 清除 auth-key cookie
  deleteCookie(event, 'auth-key', { path: '/' });

  return {
    authenticated: false,
    username: null,
  };
});
