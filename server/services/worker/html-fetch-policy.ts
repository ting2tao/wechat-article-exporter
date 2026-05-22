import { USER_AGENT } from '../../../config/index';

export function getMpArticleFetchHeaders() {
  return {
    Referer: 'https://mp.weixin.qq.com/',
    Origin: 'https://mp.weixin.qq.com',
    'User-Agent': USER_AGENT,
  };
}

export function buildProxyFetchUrl(proxy: string, url: string, authorization = '') {
  const query = new URLSearchParams({
    url,
    headers: JSON.stringify(getMpArticleFetchHeaders()),
    authorization,
  });
  return `${proxy}?${query.toString()}`;
}
