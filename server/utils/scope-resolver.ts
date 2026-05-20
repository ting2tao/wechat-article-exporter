import type { H3Event } from 'h3';
import { deleteScopeMapping, getScopeMapping, setScopeMapping } from '~/server/kv/scope';
import { cookieStore } from './CookieStore';
import { getAuthKeyFromRequest } from './proxy-request';

/**
 * authKey (session UUID) → fakeid (account ID) 映射
 * 用于让不同浏览器登录同一个公众号时共享同一份数据
 *
 * 内存 + KV 双层存储：内存用于热路径加速，KV 用于服务器重启后恢复
 */
class ScopeResolver {
  private readonly store = new Map<string, string>();

  async bind(authKey: string, fakeid: string): Promise<void> {
    console.log(`[ScopeResolver] bind: ${authKey.slice(0, 8)}... → ${fakeid}`);
    this.store.set(authKey, fakeid);
    await setScopeMapping(authKey, fakeid);
  }

  async resolve(authKey: string): Promise<string | null> {
    // 1. 内存命中
    const cached = this.store.get(authKey);
    if (cached) {
      console.log(`[ScopeResolver] resolve (memory): ${authKey.slice(0, 8)}... → ${cached}`);
      return cached;
    }

    // 2. KV 命中（服务器重启后恢复）
    const persisted = await getScopeMapping(authKey);
    if (persisted) {
      console.log(`[ScopeResolver] resolve (kv): ${authKey.slice(0, 8)}... → ${persisted}`);
      this.store.set(authKey, persisted); // 回填内存
      return persisted;
    }

    console.log(`[ScopeResolver] resolve: ${authKey.slice(0, 8)}... → (not found)`);
    return null;
  }

  async unbind(authKey: string): Promise<void> {
    this.store.delete(authKey);
    await deleteScopeMapping(authKey);
  }
}

export const scopeResolver = new ScopeResolver();

/**
 * 通过 WeChat API 查询当前登录账号的 fakeid
 * 当内存和 KV 中都没有 authKey→fakeid 映射时作为 fallback
 */
async function fetchFakeidFromWechat(authKey: string): Promise<string | null> {
  const accountCookie = await cookieStore.getAccountCookie(authKey);
  if (!accountCookie) return null;

  try {
    const token = await cookieStore.getToken(authKey);
    if (!token) return null;

    const cookieStr = accountCookie.toString();
    const resp = await fetch(`https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=${token}&lang=zh_CN`, {
      headers: {
        Cookie: cookieStr,
        Referer: 'https://mp.weixin.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    const html = await resp.text();
    const match = html.match(/wx\.cgiData\.user_name\s*?=\s*?"(?<user_name>[^"]+)"/);
    if (match?.groups?.user_name) {
      const fakeid = match.groups.user_name;
      await scopeResolver.bind(authKey, fakeid);
      return fakeid;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * 从请求中解析出用于数据分区的 scopeId
 * 1. 内存映射 authKey → fakeid
 * 2. KV 持久化映射（服务器重启后恢复）
 * 3. WeChat API 查询 fakeid
 * 4. 降级使用 authKey 本身
 */
export async function resolveScopeIdFromRequest(event: H3Event): Promise<string> {
  const authKey = getAuthKeyFromRequest(event);
  if (!authKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing auth scope' });
  }

  // 1. 内存 → 2. KV → 3. WeChat API → 4. authKey 降级
  const cached = await scopeResolver.resolve(authKey);
  if (cached) return cached;

  console.log(`[ScopeResolver] cache miss for ${authKey.slice(0, 8)}..., trying WeChat API fallback...`);
  const fakeid = await fetchFakeidFromWechat(authKey);
  if (fakeid) {
    console.log(`[ScopeResolver] WeChat API fallback resolved to: ${fakeid}`);
    return fakeid;
  }

  console.log(`[ScopeResolver] fallback failed, using authKey as scopeId`);
  return authKey;
}
