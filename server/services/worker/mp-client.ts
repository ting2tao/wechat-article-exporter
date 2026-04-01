import { ARTICLE_LIST_PAGE_SIZE, USER_AGENT } from '~/config';
import { cookieStore } from '~/server/utils/CookieStore';
import type { MpAccount } from '~/store/v2/info';
import type { AppMsgEx, AppMsgPublishResponse, PublishInfo, PublishPage } from '~/types/types';

async function getMpSession(authKey: string) {
  const [cookie, token] = await Promise.all([cookieStore.getCookie(authKey), cookieStore.getToken(authKey)]);
  if (!cookie || !token) {
    throw new Error('后台任务绑定的登录态已失效，请重新登录后在设置页保存一次任务配置');
  }

  return { cookie, token };
}

async function fetchMpJson<T>(authKey: string, endpoint: string, query: Record<string, string | number>) {
  const { cookie } = await getMpSession(authKey);
  const url = new URL(endpoint);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Referer: 'https://mp.weixin.qq.com/',
      Origin: 'https://mp.weixin.qq.com',
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'identity',
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error(`微信接口请求失败: HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function checkMpSessionStatus(
  authKey: string
): Promise<{ valid: boolean; nickname?: string; reason?: string }> {
  const { cookie, token } = await getMpSession(authKey);
  const url = new URL('https://mp.weixin.qq.com/cgi-bin/home');
  url.searchParams.set('t', 'home/index');
  url.searchParams.set('token', token);
  url.searchParams.set('lang', 'zh_CN');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Referer: 'https://mp.weixin.qq.com/',
      Origin: 'https://mp.weixin.qq.com',
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'identity',
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    return {
      valid: false,
      reason: `状态检查失败: HTTP ${response.status}`,
    };
  }

  const html = await response.text();
  const nicknameMatchResult = html.match(/wx\.cgiData\.nick_name\s*?=\s*?"(?<nick_name>[^"]+)"/);
  const nickname = nicknameMatchResult?.groups?.nick_name?.trim();

  if (!nickname) {
    return {
      valid: false,
      reason: '未能从公众号后台首页解析到账号昵称，登录态可能已失效',
    };
  }

  return {
    valid: true,
    nickname,
  };
}

export async function fetchAccountArticlePage(
  account: MpAccount,
  authKey: string,
  begin = 0
): Promise<{
  articles: AppMsgEx[];
  completed: boolean;
  totalCount: number;
}> {
  const { token } = await getMpSession(authKey);
  const resp = await fetchMpJson<AppMsgPublishResponse>(authKey, 'https://mp.weixin.qq.com/cgi-bin/appmsgpublish', {
    sub: 'list',
    search_field: 'null',
    begin,
    count: ARTICLE_LIST_PAGE_SIZE,
    query: '',
    fakeid: account.fakeid,
    type: '101_1',
    free_publish_type: 1,
    sub_action: 'list_ex',
    token,
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  });

  if (resp.base_resp.ret === 200003) {
    throw new Error('微信公众号平台登录已过期，请重新扫码登录');
  }
  if (resp.base_resp.ret !== 0) {
    throw new Error(`${resp.base_resp.ret}:${resp.base_resp.err_msg}`);
  }

  const publishPage: PublishPage = JSON.parse(resp.publish_page);
  const publishList = publishPage.publish_list.filter(item => !!item.publish_info);
  const articles = publishList.flatMap(item => {
    const publishInfo: PublishInfo = JSON.parse(item.publish_info);
    return publishInfo.appmsgex;
  });

  return {
    articles,
    completed: publishList.length === 0,
    totalCount: publishPage.total_count,
  };
}
