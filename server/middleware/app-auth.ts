import { createError, defineEventHandler } from 'h3';
import { cookieStore } from '~/server/utils/CookieStore';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

const PUBLIC_API_PATHS = new Set(['/api/app/auth/login', '/api/app/auth/logout', '/api/app/auth/session']);

// 登录相关路径不需要 auth-key 验证
const LOGIN_PATHS = ['/api/web/login/'];

function isPublicPath(path: string): boolean {
  if (PUBLIC_API_PATHS.has(path)) return true;
  if (LOGIN_PATHS.some(prefix => path.startsWith(prefix))) return true;
  return false;
}

export default defineEventHandler(async event => {
  const path = event.path;

  if (isPublicPath(path)) {
    return;
  }

  if (!path.startsWith('/api/web/') && path !== '/api/_debug') {
    return;
  }

  // 检查 auth-key cookie 是否有效
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录系统',
    });
  }

  const accountCookie = await cookieStore.getAccountCookie(authKey);
  if (!accountCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: '登录态已过期，请重新扫码登录',
    });
  }
});
