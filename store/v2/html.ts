import { db } from './db';

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
  return db.transaction('rw', 'html', async () => {
    await db.html.put(html);
    return true;
  });
}

export async function upsertHtmlCaches(htmlAssets: HtmlAsset[]): Promise<void> {
  if (htmlAssets.length === 0) {
    return;
  }

  await db.transaction('rw', 'html', async () => {
    await db.html.bulkPut(htmlAssets);
  });
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getHtmlCache(url: string): Promise<HtmlAsset | undefined> {
  return db.html.get(url);
}

export async function getHtmlCacheUrlsByFakeid(fakeid: string): Promise<string[]> {
  return db.html.where('fakeid').equals(fakeid).primaryKeys() as Promise<string[]>;
}
