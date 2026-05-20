const WECHAT_HOSTS = new Set(['mp.weixin.qq.com', 'weixin.qq.com']);

export function isWechatMpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' && WECHAT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function extractWechatBizFromUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!WECHAT_HOSTS.has(parsed.hostname)) {
      return null;
    }
    return parsed.searchParams.get('__biz') || parsed.searchParams.get('biz');
  } catch {
    return null;
  }
}
