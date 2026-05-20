export interface DebugAsset {
  type: string;
  url: string;
  file: Blob;
  title: string;
  fakeid: string;
}

/**
 * 更新 debug 缓存
 * @param html 缓存
 */
export async function updateDebugCache(html: DebugAsset): Promise<boolean> {
  const formData = new FormData();
  formData.append('fakeid', html.fakeid);
  formData.append('url', html.url);
  formData.append('type', html.type);
  formData.append('title', html.title);
  formData.append('file', html.file, 'debug.html');

  await $fetch('/api/web/data/debug', {
    method: 'POST',
    body: formData,
  });

  return true;
}

/**
 * 获取 debug 缓存
 * @param url
 */
export async function getDebugCache(url: string): Promise<DebugAsset | undefined> {
  try {
    const response = await fetch(`/api/web/data/debug?url=${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    return {
      type: decodeURIComponent(response.headers.get('X-Type') || ''),
      url,
      file: blob,
      title: decodeURIComponent(response.headers.get('X-Title') || ''),
      fakeid: response.headers.get('X-Fakeid') || '',
    };
  } catch {
    return undefined;
  }
}

export async function getDebugInfo(): Promise<DebugAsset[]> {
  try {
    const entries = await $fetch<Array<{ fakeid: string; url: string; type: string; title: string }>>(
      '/api/web/data/debug'
    );
    // Return metadata only, without file content
    return entries.map(entry => ({
      type: entry.type,
      url: entry.url,
      file: new Blob(),
      title: entry.title,
      fakeid: entry.fakeid,
    }));
  } catch {
    return [];
  }
}
