export interface ResourceAsset {
  fakeid: string;
  url: string;
  file: Blob;
}

/**
 * 更新 resource 缓存
 * @param resource 缓存
 */
export async function updateResourceCache(resource: ResourceAsset): Promise<boolean> {
  const formData = new FormData();
  formData.append('fakeid', resource.fakeid);
  formData.append('url', resource.url);
  formData.append('contentType', resource.file.type || 'application/octet-stream');
  formData.append('file', resource.file, 'resource');

  await $fetch('/api/web/data/resources', {
    method: 'POST',
    body: formData,
  });

  return true;
}

/**
 * 获取 resource 缓存
 * @param url
 */
export async function getResourceCache(url: string): Promise<ResourceAsset | undefined> {
  try {
    const response = await fetch(`/api/web/data/resources?url=${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    // Extract fakeid from response header or use empty string
    const fakeid = response.headers.get('X-Fakeid') || '';
    return { fakeid, url, file: blob };
  } catch {
    return undefined;
  }
}
