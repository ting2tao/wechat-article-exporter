interface StorageLike {
  getItem(key: string): string | null;
}

interface StoredPreferences {
  privateProxyList?: unknown;
  privateProxyAuthorization?: unknown;
}

export interface ProxyPreferences {
  urls: string[];
  authorization: string;
}

function normalizeProxyUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(item => item.length > 0 && /^https?:\/\//i.test(item));
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readProxyPreferences(storage: StorageLike): ProxyPreferences {
  const preferences = parseJson(storage.getItem('preferences')) as StoredPreferences | null;
  const urls = normalizeProxyUrls(preferences?.privateProxyList);
  const authorization =
    typeof preferences?.privateProxyAuthorization === 'string' ? preferences.privateProxyAuthorization.trim() : '';

  if (urls.length > 0) {
    return {
      urls,
      authorization,
    };
  }

  return {
    urls: normalizeProxyUrls(parseJson(storage.getItem('wechat-proxy'))),
    authorization: '',
  };
}

export function buildProxiedResourceUrl(
  proxy: string,
  url: string,
  authorization = '',
  headers: Record<string, string> = {}
) {
  const query = new URLSearchParams({
    url,
    headers: JSON.stringify(headers),
  });
  if (authorization) {
    query.set('authorization', authorization);
  }

  return `${proxy}?${query.toString()}`;
}
