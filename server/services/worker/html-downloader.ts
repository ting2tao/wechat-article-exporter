import { validateHTMLContent } from '#shared/utils/html';
import { PUBLIC_PROXY_LIST } from '~/config/public-proxy';
import {
  listPendingHtmlArticles,
  markArticleDeleted,
  markArticleHtmlDownloaded,
} from '~/server/services/worker/repository';
import { DEFAULT_OPTIONS } from '~/utils/download/constants';
import { ProxyManager } from '~/utils/download/ProxyManager';

interface HtmlDownloadSummary {
  completed: number;
  failed: number;
  deleted: number;
}

function getWorkerProxyList() {
  const envList = process.env.WORKER_PROXY_LIST?.split(',')
    .map(item => item.trim())
    .filter(Boolean);
  return envList?.length ? envList : PUBLIC_PROXY_LIST;
}

function getProxyAuthorization() {
  return process.env.WORKER_PROXY_AUTHORIZATION || '';
}

async function writeHtmlFile(fakeid: string, aid: string, html: string) {
  const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  const baseDir = path.resolve(process.cwd(), process.env.WORKER_HTML_DIR || '.data/worker-html');
  const accountDir = path.join(baseDir, fakeid);
  await fs.mkdir(accountDir, { recursive: true });
  const filePath = path.join(accountDir, `${aid.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`);
  await fs.writeFile(filePath, html, 'utf8');
  return path.relative(process.cwd(), filePath);
}

async function fetchHtmlThroughProxy(url: string, proxyManager: ProxyManager) {
  const authorization = getProxyAuthorization();

  for (let attempt = 0; attempt < DEFAULT_OPTIONS.MAX_RETRIES; attempt++) {
    const proxy = proxyManager.getBestProxy();
    try {
      const proxyUrl = `${proxy}?url=${encodeURIComponent(url)}&headers=${encodeURIComponent('{}')}&authorization=${authorization}`;
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(DEFAULT_OPTIONS.TIMEOUT),
        referrerPolicy: 'unsafe-url',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      proxyManager.recordSuccess(proxy);
      return response.text();
    } catch (error) {
      proxyManager.recordFailure(proxy);
      if (attempt === DEFAULT_OPTIONS.MAX_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw new Error('下载 HTML 失败');
}

export async function downloadPendingHtmlBatch(limit: number): Promise<HtmlDownloadSummary> {
  const articles = await listPendingHtmlArticles(limit);
  if (articles.length === 0) {
    return {
      completed: 0,
      failed: 0,
      deleted: 0,
    };
  }

  const proxyManager = new ProxyManager(
    getWorkerProxyList(),
    DEFAULT_OPTIONS.COOLDOWN_PERIOD,
    DEFAULT_OPTIONS.MAX_FAILURES
  );
  const summary: HtmlDownloadSummary = {
    completed: 0,
    failed: 0,
    deleted: 0,
  };

  for (const article of articles) {
    try {
      const html = await fetchHtmlThroughProxy(article.link, proxyManager);
      const [status] = validateHTMLContent(html);
      if (status === 'Success') {
        const filePath = await writeHtmlFile(article.fakeid, article.aid, html);
        await markArticleHtmlDownloaded(article.id, filePath);
        summary.completed++;
      } else if (status === 'Deleted') {
        await markArticleDeleted(article.id);
        summary.deleted++;
      } else {
        summary.failed++;
      }
    } catch (error) {
      console.error(`后台下载 HTML 失败: ${article.link}`, error);
      summary.failed++;
    }
  }

  return summary;
}
