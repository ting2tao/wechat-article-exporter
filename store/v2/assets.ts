export interface Asset {
  url: string;
  file: Blob;
  fakeid: string;
}

/**
 * 更新 asset 缓存
 * @param asset
 */
export async function updateAssetCache(asset: Asset): Promise<boolean> {
  const formData = new FormData();
  formData.append('fakeid', asset.fakeid);
  formData.append('url', asset.url);
  formData.append('contentType', asset.file.type || 'application/octet-stream');
  formData.append('file', asset.file, 'asset');

  await $fetch('/api/web/data/resources', {
    method: 'POST',
    body: formData,
  });

  return true;
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getAssetCache(url: string): Promise<Asset | undefined> {
  try {
    const response = await fetch(`/api/web/data/resources?url=${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    const fakeid = response.headers.get('X-Fakeid') || '';
    return { url, file: blob, fakeid };
  } catch {
    return undefined;
  }
}
