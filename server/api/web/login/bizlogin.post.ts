import dayjs from 'dayjs';
import { request } from '#shared/utils/request';
import { getCookieFromResponse, getCookiesFromRequest } from '~/server/utils/CookieStore';
import { proxyMpRequest } from '~/server/utils/proxy-request';

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function extractLoginError(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json();
    const errMsg = payload?.err || payload?.message || payload?.base_resp?.err_msg;
    if (typeof errMsg === 'string' && errMsg.trim()) {
      return errMsg;
    }
  } catch {
    // ignore json parse errors and fall back to status text below
  }

  if (!response.ok) {
    return `登录失败（HTTP ${response.status}）`;
  }

  return null;
}

export default defineEventHandler(async event => {
  const cookie = getCookiesFromRequest(event, ['uuid']);

  const payload: Record<string, string | number> = {
    userlang: 'zh_CN',
    redirect_url: '',
    cookie_forbidden: 0,
    cookie_cleaned: 0,
    plugin_used: 0,
    login_type: 3,
    token: '',
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  };

  const response: Response = await proxyMpRequest({
    event: event,
    method: 'POST',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
    query: {
      action: 'login',
    },
    body: payload,
    cookie: cookie,
    action: 'login', // 有这个标志就会把微信原始响应中的所有 set-cookie 存储在 CookieStore 中，并返回给客户端一个唯一的cookie: auth-key=xxx
  });

  // 从响应中取出唯一的 set-cookie (即上一步 `action=login` 标志所设置的 auth-key=xxx)
  const authKey = response.headers.get('X-Auth-Key') || getCookieFromResponse('auth-key', response);
  if (!authKey) {
    return {
      err: (await extractLoginError(response)) || '登录失败，请稍后重试',
    };
  }

  try {
    const { nick_name, head_img, error } = await request<{
      nick_name: string;
      head_img: string;
      error?: string;
    }>(`/api/web/mp/info`, {
      headers: {
        // 服务端内部再次访问 /api/web/* 时，需要透传系统登录 cookie，避免被 app-auth 中间件拦截
        Cookie: getHeader(event, 'Cookie') || '',
        'X-Auth-Key': authKey,
      },
    });

    if (!nick_name) {
      return {
        err: error || '获取公众号昵称失败，请稍后重试',
      };
    }

    const body = JSON.stringify({
      nickname: nick_name,
      avatar: head_img,
      expires: dayjs().add(4, 'days').toString(),
    });
    const headers = new Headers(response.headers);
    headers.set('Content-Length', new TextEncoder().encode(body).length.toString());
    return new Response(body, { headers: headers });
  } catch (error) {
    return {
      err: `获取公众号昵称失败：${normalizeErrorMessage(error)}`,
    };
  }
});
