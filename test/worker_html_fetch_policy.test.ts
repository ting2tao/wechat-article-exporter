import assert from 'node:assert/strict';
import test from 'node:test';

const { buildProxyFetchUrl, getMpArticleFetchHeaders } = await import(
  new URL('../server/services/worker/html-fetch-policy.ts', import.meta.url).href
);

test('buildProxyFetchUrl sends mp article headers to proxy', () => {
  const proxyUrl = buildProxyFetchUrl('https://proxy.example.com', 'https://mp.weixin.qq.com/s/article-id', 'Bearer abc');
  const parsed = new URL(proxyUrl);
  const headers = JSON.parse(decodeURIComponent(parsed.searchParams.get('headers') || '{}'));

  assert.equal(parsed.searchParams.get('url'), 'https://mp.weixin.qq.com/s/article-id');
  assert.equal(parsed.searchParams.get('authorization'), 'Bearer abc');
  assert.deepEqual(headers, getMpArticleFetchHeaders());
  assert.equal(headers.Referer, 'https://mp.weixin.qq.com/');
  assert.equal(headers.Origin, 'https://mp.weixin.qq.com');
  assert.ok(headers['User-Agent']);
});
