/**
 * 退出登录接口
 */

import { deleteCookie, parseCookies } from 'h3';
import { cookieStore, getTokenFromStore } from '~/server/utils/CookieStore';
import { proxyMpRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  const authKey = getRequestHeader(event, 'X-Auth-Key') || parseCookies(event)['auth-key'];
  const token = await getTokenFromStore(event);

  try {
    if (!token) {
      return { statusCode: 200, statusText: '已退出登录' };
    }

    const response: Response = await proxyMpRequest({
      event: event,
      method: 'GET',
      endpoint: 'https://mp.weixin.qq.com/cgi-bin/logout',
      query: {
        t: 'wxm-logout',
        token: token,
        lang: 'zh_CN',
      },
    });

    return {
      statusCode: response.status,
      statusText: response.statusText,
    };
  } finally {
    if (authKey) {
      await cookieStore.removeCookie(authKey);
    }

    deleteCookie(event, 'auth-key', {
      path: '/',
    });
  }
});
