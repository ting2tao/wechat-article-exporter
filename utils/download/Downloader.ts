import { throwException } from '#shared/utils/helpers';
import { parseCgiDataNew, validateHTMLContent } from '#shared/utils/html';
import usePreferences from '~/composables/usePreferences';
import { getArticleByLink, getSingleArticleByLink } from '~/store/v2/article';
import { updateDebugCache } from '~/store/v2/debug';
import { getHtmlCache, updateHtmlCache } from '~/store/v2/html';
import type { Preferences } from '~/types/preferences';
import { BaseDownloader } from '~/utils/download/BaseDownloader';
import type { DownloadOptions } from './types';

type DownloadType = 'html' | 'fakeid';

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

export class Downloader extends BaseDownloader {
  private downloadType: DownloadType = 'html';
  private isStopping = false;

  constructor(urls: string[], options: DownloadOptions = {}) {
    super(urls, options);
  }

  public async startDownload(type: DownloadType) {
    if (this.isRunning) {
      throw new Error('下载任务正在运行中，无需重复启动');
    }

    this.downloadType = type;
    this.isRunning = true;
    const start = Date.now();
    this.emit('download:begin');

    try {
      await this.processDownloadQueue();
    } finally {
      this.isRunning = false;
      const elapse = Math.round((Date.now() - start) / 1000);
      this.emit('download:finish', elapse, this.getStatus());
      this.cancelAllPending();
    }
  }

  public stop() {
    this.isStopping = true;
  }

  private async processDownloadQueue() {
    const activePromises: Set<Promise<any>> = new Set();

    begin: while (this.urls.length > 0 || activePromises.size > 0) {
      while (activePromises.size < this.options.concurrency && this.urls.length > 0) {
        if (this.isStopping) {
          break begin;
        }

        const url: string = this.urls.pop()!;
        const promise = this.processTask(url);
        activePromises.add(promise);
        promise.finally(() => {
          activePromises.delete(promise);
          this.emit('download:progress', url, this.completed.has(url), this.getStatus());
        });
      }

      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }

    if (this.isStopping) {
      this.emit('download:stop');
    }
  }

  private async processTask(url: string) {
    if (this.downloadType === 'html') {
      return this.downloadHTMLTask(url);
    }

    return this.fixSingleFakeidTask(url);
  }

  private async fixSingleFakeidTask(url: string) {
    this.pending.add(url);

    const article = await getSingleArticleByLink(url);
    if (!article) {
      this.pending.delete(url);
      this.failed.add(url);
      return;
    }

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      const proxy = this.proxyManager.getBestProxy();

      try {
        const blob = await this.download(article.fakeid, url, proxy);
        const html = await blob.text();
        const cgiData = await parseCgiDataNew(html);
        if (cgiData && cgiData.bizuin) {
          this.emit('fix:fakeid', url, cgiData.bizuin);

          this.pending.delete(url);
          this.completed.add(url);
          this.proxyManager.recordSuccess(proxy);
          return;
        }
      } catch (error) {
        await this.handleDownloadFailure(proxy, url, attempt, error);
      }
    }

    this.pending.delete(url);
    this.failed.add(url);
  }

  private async downloadHTMLTask(url: string): Promise<void> {
    this.pending.add(url);

    if (!preferences.value.downloadConfig.forceDownloadContent) {
      const cached = await getHtmlCache(url);
      if (cached) {
        this.pending.delete(url);
        this.completed.add(url);
        return;
      }
    }

    const article = await getArticleByLink(url);
    if (!article) {
      this.pending.delete(url);
      this.failed.add(url);
      return;
    }

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      const proxy = this.proxyManager.getBestProxy();

      try {
        const blob = await this.download(article.fakeid, url, proxy);
        const html = await blob.text();
        const [status, commentID] = validateHTMLContent(html);
        if (status === 'Success') {
          // Extract real fakeid from HTML and emit fix event for single articles
          try {
            const cgiData = await parseCgiDataNew(html);
            if (cgiData?.bizuin && cgiData.bizuin !== article.fakeid) {
              this.emit('fix:fakeid', url, cgiData.bizuin);
            }
          } catch {
            // Ignore parse errors; fakeid fix is best-effort
          }

          await updateHtmlCache({
            fakeid: article.fakeid,
            url,
            title: article.title,
            file: blob,
            commentID,
          });
          this.pending.delete(url);
          this.completed.add(url);
          this.proxyManager.recordSuccess(proxy);
          return;
        }

        if (status === 'Deleted') {
          console.warn(`文章(url: ${url} )已被删除`);
          this.emit('download:deleted', url);
          this.pending.delete(url);
          this.deleted.add(url);
          this.proxyManager.recordSuccess(proxy);
          return;
        }

        if (status === 'Exception' && commentID) {
          console.warn(`文章(url: ${url} )状态异常: ${commentID}`);
          this.emit('download:exception', url, commentID);
          this.pending.delete(url);
          this.failed.add(url);
          this.proxyManager.recordSuccess(proxy);
          return;
        }

        if (status === 'Exception' && !commentID) {
          console.warn(`文章(url: ${url} )下载失败(风控所致)`);
          await updateDebugCache({
            fakeid: article.fakeid,
            type: `exception:${commentID}`,
            url,
            title: article.title,
            file: blob,
          });
          throwException(`文章(url: ${url} )下载失败`);
        }

        if (status === 'Error') {
          console.warn(`文章(url: ${url} )解析失败`);
          await updateDebugCache({
            fakeid: article.fakeid,
            type: 'parse error',
            url,
            title: article.title,
            file: blob,
          });
          throwException(`文章(url: ${url} )解析失败`);
        }
      } catch (error) {
        await this.handleDownloadFailure(proxy, url, attempt, error);
      }
    }

    this.pending.delete(url);
    this.failed.add(url);
  }
}
