import { sleep, timeout } from '#shared/utils/helpers';
import usePreferences from '~/composables/usePreferences';
import { PUBLIC_PROXY_LIST } from '~/config/public-proxy';
import type { Preferences } from '~/types/preferences';
import { bestConcurrencyCount } from '~/utils';
import { DEFAULT_OPTIONS } from './constants';
import { ProxyManager } from './ProxyManager';
import type { Callback, DownloaderStatus, DownloadOptions } from './types';

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

// 下载器
// 支持下载文章 HTML 与单篇文章 fakeid 修复
export class BaseDownloader {
  protected readonly urls: string[];
  protected readonly pending: Set<string>;
  protected readonly completed: Set<string>;
  protected readonly failed: Set<string>;
  protected readonly deleted: Set<string>;

  protected readonly options: Required<DownloadOptions>;
  protected isRunning: boolean;
  protected readonly abortControllers: Map<string, AbortController>;
  public readonly proxyManager: ProxyManager;
  protected events: Map<string, Callback[]>;

  constructor(urls: string[], options: DownloadOptions = {}) {
    this.validateInputs(urls);

    const proxies = (preferences.value as Preferences).privateProxyList || [];
    if (proxies.length === 0) {
      proxies.push(...PUBLIC_PROXY_LIST);
    }

    this.urls = [...urls].reverse();
    this.pending = new Set();
    this.completed = new Set();
    this.failed = new Set();
    this.deleted = new Set();
    this.isRunning = false;
    this.abortControllers = new Map();
    this.events = new Map();

    this.options = {
      concurrency: options.concurrency ?? bestConcurrencyCount(proxies.length),
      timeout: options.timeout ?? DEFAULT_OPTIONS.TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_OPTIONS.MAX_RETRIES,
      cooldownPeriod: options.cooldownPeriod ?? DEFAULT_OPTIONS.COOLDOWN_PERIOD,
      maxFailures: options.maxFailures ?? DEFAULT_OPTIONS.MAX_FAILURES,
    };

    this.proxyManager = new ProxyManager(proxies, this.options.cooldownPeriod, this.options.maxFailures);
  }

  public on(type: string, listener: Callback) {
    if (!this.events.has(type)) {
      this.events.set(type, []);
    }
    this.events.get(type)!.push(listener);
  }

  public off(type: string, listener?: Callback) {
    if (!this.events.has(type)) {
      return;
    }
    if (!listener) {
      this.events.delete(type);
    } else {
      const idx = this.events.get(type)!.indexOf(listener);
      if (idx > -1) {
        this.events.get(type)!.splice(idx, 1);
      }
    }
  }

  public removeAllListeners() {
    this.events.clear();
  }

  public cancelAllPending(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  public getStatus(): DownloaderStatus {
    return {
      pending: Array.from(this.pending),
      completed: Array.from(this.completed),
      failed: Array.from(this.failed),
      deleted: Array.from(this.deleted),
      proxy: this.proxyManager.getProxyStatus(),
    };
  }

  protected emit(type: string, ...args: any[]) {
    if (this.events.has(type)) {
      this.events.get(type)!.forEach(fn => {
        fn.call(type, ...args);
      });
    }
  }

  protected async handleDownloadFailure(proxy: string, url: string, attempt: number, error: any): Promise<void> {
    this.proxyManager.recordFailure(proxy);
    console.warn(`Attempt ${attempt + 1} failed for ${url} using ${proxy}:`, error);

    if (attempt < this.options.maxRetries - 1) {
      const delay = Math.pow(2, attempt);
      console.warn('下载失败，延迟', delay, '秒后重试');
      await sleep(1000 * delay);
    }
  }

  protected async download(_fakeid: string, url: string, proxy: string): Promise<Blob> {
    const abortController = new AbortController();
    this.abortControllers.set(url, abortController);

    try {
      const authorization = (preferences.value as Preferences).privateProxyAuthorization || '';
      const proxyUrl = `${proxy}?url=${encodeURIComponent(url)}&headers=${encodeURIComponent('{}')}&authorization=${authorization}`;
      const response = (await Promise.race([
        fetch(proxyUrl, {
          signal: abortController.signal,
          referrerPolicy: 'unsafe-url',
        }),
        timeout(this.options.timeout),
      ])) as Response;

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } finally {
      this.abortControllers.delete(url);
    }
  }

  protected validateInputs(urls: string[]): void {
    urls.forEach(url => {
      try {
        new URL(url);
      } catch {
        throw new Error(`非法URL: ${url}`);
      }
    });
  }
}
