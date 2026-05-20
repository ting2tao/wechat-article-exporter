import { cookieStore } from '~/server/utils/CookieStore';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import { scopeResolver } from '~/server/utils/scope-resolver';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);

  // 这里进行服务器验证，确定请求中的 auth-key 是否还有效
  const accountCookie = authKey ? await cookieStore.getAccountCookie(authKey) : null;

  if (authKey && accountCookie) {
    // 优先返回解析后的真实 scopeId（fakeid），让客户端 localStorage 存储正确的值
    const scopeId = (await scopeResolver.resolve(authKey)) || authKey;
    return {
      code: 0,
      data: scopeId,
    };
  } else {
    return {
      code: -1,
      msg: 'AuthKey not found',
    };
  }
});
