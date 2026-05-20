import { cookieStore } from '~/server/utils/CookieStore';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { resolveScopeIdFromRequest } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    return { authenticated: false, username: null };
  }

  const accountCookie = await cookieStore.getAccountCookie(authKey);
  if (!accountCookie) {
    return { authenticated: false, username: null };
  }

  // 尝试解析 scopeId（fakeid）用于显示公众号名称
  let username: string | null = null;
  try {
    const scopeId = await resolveScopeIdFromRequest(event);
    username = scopeId || authKey;
  } catch {
    username = authKey;
  }

  return {
    authenticated: true,
    username,
  };
});
