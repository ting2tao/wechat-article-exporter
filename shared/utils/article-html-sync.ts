export interface WorkerHtmlArticle {
  fakeid: string;
  aid: string;
  link: string;
  title: string;
  html_downloaded?: boolean;
  is_deleted?: boolean;
}

export interface WorkerHtmlBackfillTarget {
  fakeid: string;
  aid: string;
  link: string;
  title: string;
}

function articleKey(article: Pick<WorkerHtmlArticle, 'fakeid' | 'aid'>) {
  return `${article.fakeid}:${article.aid}`;
}

export function pickWorkerHtmlBackfillTargets(
  workerArticles: WorkerHtmlArticle[],
  cachedUrls: Iterable<string>
): WorkerHtmlBackfillTarget[] {
  const cachedUrlSet = new Set(cachedUrls);
  const seen = new Set<string>();
  const targets: WorkerHtmlBackfillTarget[] = [];

  for (const article of workerArticles) {
    if (!article.html_downloaded || article.is_deleted || cachedUrlSet.has(article.link)) {
      continue;
    }

    const key = articleKey(article);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push({
      fakeid: article.fakeid,
      aid: article.aid,
      link: article.link,
      title: article.title,
    });
  }

  return targets;
}
