export interface HtmlAsset {
  fakeid: string;
  url: string;
  file: Blob;
  title: string;
  commentID: string | null;
}

/**
 * 更新 html 缓存
 * @param html 缓存
 */
export async function updateHtmlCache(html: HtmlAsset): Promise<boolean> {
  const formData = new FormData();
  formData.append('fakeid', html.fakeid);
  formData.append('url', html.url);
  formData.append('title', html.title);
  formData.append('commentID', html.commentID || '');
  formData.append('file', html.file, 'content.html');

  await $fetch('/api/web/data/html', {
    method: 'POST',
    body: formData,
  });

  return true;
}

export async function upsertHtmlCaches(htmlAssets: HtmlAsset[]): Promise<void> {
  if (htmlAssets.length === 0) {
    return;
  }

  // Upload with concurrency limit to avoid overwhelming the server
  const CONCURRENCY = 5;
  for (let i = 0; i < htmlAssets.length; i += CONCURRENCY) {
    const batch = htmlAssets.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(html => updateHtmlCache(html)));
  }
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getHtmlCache(url: string): Promise<HtmlAsset | undefined> {
  try {
    const response = await fetch(`/api/web/data/html?url=${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    return {
      fakeid: response.headers.get('X-Fakeid') || '',
      url,
      file: blob,
      title: decodeURIComponent(response.headers.get('X-Title') || ''),
      commentID: response.headers.get('X-Comment-Id') || null,
    };
  } catch {
    return undefined;
  }
}

export async function getHtmlCacheUrlsByFakeid(fakeid: string): Promise<string[]> {
  return $fetch('/api/web/data/html/urls', {
    query: { fakeid },
  });
}
