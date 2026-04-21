import type { AppMsgExWithFakeID } from '../../types/types.d.ts';

function articleKey(article: Pick<AppMsgExWithFakeID, 'fakeid' | 'aid'>) {
  return `${article.fakeid}:${article.aid}`;
}

function getFreshnessScore(article: AppMsgExWithFakeID) {
  return article.update_time || article.create_time || 0;
}

function mergeArticle(
  local: AppMsgExWithFakeID | undefined,
  worker: AppMsgExWithFakeID | undefined
): AppMsgExWithFakeID {
  if (!local && !worker) {
    throw new Error('mergeArticle requires at least one article');
  }
  if (!local) {
    return { ...worker! };
  }
  if (!worker) {
    return { ...local };
  }

  const preferWorker = getFreshnessScore(worker) > getFreshnessScore(local);
  const primary = preferWorker ? worker : local;
  const secondary = preferWorker ? local : worker;

  return {
    ...secondary,
    ...primary,
    fakeid: primary.fakeid,
    aid: primary.aid,
    link: primary.link,
    _status: primary._status || secondary._status || '',
    _single: primary._single || secondary._single || undefined,
  };
}

export function mergeTrackedArticles(localArticles: AppMsgExWithFakeID[], workerArticles: AppMsgExWithFakeID[]) {
  const workerMap = new Map(workerArticles.map(article => [articleKey(article), article]));
  const merged = localArticles.map(article => {
    const key = articleKey(article);
    const worker = workerMap.get(key);
    if (worker) {
      workerMap.delete(key);
    }
    return mergeArticle(article, worker);
  });

  for (const article of workerMap.values()) {
    merged.push({ ...article });
  }

  return merged;
}
