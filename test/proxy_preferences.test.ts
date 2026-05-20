import assert from 'node:assert/strict';
import test from 'node:test';

const { buildProxiedResourceUrl, readProxyPreferences } = await import(
  new URL('../utils/proxy-preferences.ts', import.meta.url).href
);

function storage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

test('readProxyPreferences uses current preferences proxy settings', () => {
  const result = readProxyPreferences(
    storage({
      preferences: JSON.stringify({
        privateProxyList: ['https://private-proxy.example.com', ''],
        privateProxyAuthorization: 'Bearer token',
      }),
    })
  );

  assert.deepEqual(result.urls, ['https://private-proxy.example.com']);
  assert.equal(result.authorization, 'Bearer token');
});

test('readProxyPreferences falls back to legacy wechat-proxy list', () => {
  const result = readProxyPreferences(
    storage({
      'wechat-proxy': JSON.stringify(['https://legacy-proxy.example.com']),
    })
  );

  assert.deepEqual(result.urls, ['https://legacy-proxy.example.com']);
  assert.equal(result.authorization, '');
});

test('buildProxiedResourceUrl includes authorization', () => {
  const url = buildProxiedResourceUrl('https://proxy.example.com', 'https://mp.weixin.qq.com/s/id', 'Bearer token');
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('url'), 'https://mp.weixin.qq.com/s/id');
  assert.equal(parsed.searchParams.get('authorization'), 'Bearer token');
});
