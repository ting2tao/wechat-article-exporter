export interface ResourceMapAsset {
  fakeid: string;
  url: string;
  resources: string[];
}

/**
 * 更新 resource-map 缓存
 * @param resourceMap 缓存
 */
export async function updateResourceMapCache(resourceMap: ResourceMapAsset): Promise<boolean> {
  await $fetch('/api/web/data/resource-map', {
    method: 'POST',
    body: resourceMap,
  });

  return true;
}

/**
 * 获取 resource-map 缓存
 * @param url
 */
export async function getResourceMapCache(url: string): Promise<ResourceMapAsset | undefined> {
  try {
    return await $fetch('/api/web/data/resource-map', {
      query: { url },
    });
  } catch {
    return undefined;
  }
}
