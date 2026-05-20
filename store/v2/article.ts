import type { AppMsgExWithFakeID, PublishInfo, PublishPage } from '~/types/types';
import { type MpAccount, updateInfoCache } from './info';

export type ArticleAsset = AppMsgExWithFakeID;

/**
 * 更新文章缓存
 * @param account
 * @param publish_page
 */
export async function updateArticleCache(account: MpAccount, publish_page: PublishPage) {
  const fakeid = account.fakeid;
  const total_count = publish_page.total_count;
  const publish_list = publish_page.publish_list.filter(item => !!item.publish_info);

  // 统计本次缓存成功新增的数量
  let msgCount = 0;
  let articleCount = 0;

  const articlesToUpsert: AppMsgExWithFakeID[] = [];

  for (const item of publish_list) {
    let publish_info: PublishInfo;
    try {
      publish_info = JSON.parse(item.publish_info);
    } catch {
      console.warn(`Failed to parse publish_info for item, skipping`);
      continue;
    }
    let newEntryCount = 0;

    for (const article of publish_info.appmsgex) {
      articlesToUpsert.push({ ...article, fakeid, _status: '' });
      newEntryCount++;
      articleCount++;
    }

    if (newEntryCount > 0) {
      msgCount++;
    }
  }

  // Batch upsert articles
  if (articlesToUpsert.length > 0) {
    await $fetch('/api/web/data/articles/upsert', {
      method: 'POST',
      body: { articles: articlesToUpsert },
    });
  }

  // Update account info
  await updateInfoCache({
    fakeid: fakeid,
    completed: publish_list.length === 0,
    count: msgCount,
    articles: articleCount,
    nickname: account.nickname,
    round_head_img: account.round_head_img,
    total_count: total_count,
  });
}

/**
 * 检查是否存在指定时间之前的缓存
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function hitCache(fakeid: string, create_time: number): Promise<boolean> {
  const result = await $fetch<{ hit: boolean }>('/api/web/data/articles/hit', {
    query: { fakeid, before: create_time },
  });
  return result.hit;
}

/**
 * 读取缓存中的指定时间之前的历史文章
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function getArticleCache(fakeid: string, create_time: number): Promise<AppMsgExWithFakeID[]> {
  return $fetch('/api/web/data/articles', {
    query: { fakeid, before: create_time },
  });
}

export async function upsertArticleCacheRecords(articles: AppMsgExWithFakeID[]): Promise<void> {
  if (articles.length === 0) {
    return;
  }

  await $fetch('/api/web/data/articles/upsert', {
    method: 'POST',
    body: { articles },
  });
}

/**
 * 根据 url 获取文章对象
 * @param url
 */
export async function getArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  return $fetch('/api/web/data/articles/by-link', {
    query: { url },
  });
}

// 根据 url 获取 SINGLE_ARTICLE_FAKEID 文章对象
export async function getSingleArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  return $fetch('/api/web/data/articles/single-by-link', {
    query: { url },
  });
}

/**
 * 文章被删除
 * @param url
 * @param is_deleted
 */
export async function articleDeleted(url: string, is_deleted = true): Promise<void> {
  await $fetch('/api/web/data/articles/deleted', {
    method: 'PUT',
    body: { url, is_deleted },
  });
}

/**
 * 更新文章状态
 * @param url
 * @param status
 */
export async function updateArticleStatus(url: string, status: string): Promise<void> {
  await $fetch('/api/web/data/articles/status', {
    method: 'PUT',
    body: { url, status },
  });
}

/**
 * 更新文章的fakeid
 * @param url
 * @param fakeid
 */
export async function updateArticleFakeid(url: string, fakeid: string): Promise<void> {
  await $fetch('/api/web/data/articles/fakeid', {
    method: 'PUT',
    body: { url, fakeid },
  });
}
