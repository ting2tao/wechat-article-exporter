import type { MpAccount } from '~/store/v2/info';
import type { AppMsgEx } from '~/types/types';
import type {
  WorkerSchedulerConfig,
  WorkerSchedulerSnapshot,
  WorkerSchedulerState,
  WorkerSchedulerStats,
} from '~/types/worker-scheduler';

interface SchedulerConfigRecord {
  syncEnabled: number;
  syncIntervalMinutes: number;
  downloadEnabled: number;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  alertWebhookUrl: string | null;
  authKey: string | null;
  authBoundAt: number | null;
}

interface WorkerAccountRow {
  fakeid: string;
  nickname: string | null;
  round_head_img: string | null;
  total_count: number;
  article_count: number;
  message_count: number;
  last_sync_at: number | null;
  last_article_time: number | null;
  created_at: number;
  updated_at: number;
}

interface PendingHtmlArticleRow {
  id: string;
  fakeid: string;
  aid: string;
  title: string;
  link: string;
}

interface SqliteApi {
  all<T>(sql: string, params?: unknown[]): T[];
  get<T>(sql: string, params?: unknown[]): T | undefined;
  run(sql: string, params?: unknown[]): { changes: number };
  exec(sql: string): void;
}

const DEFAULT_CONFIG: SchedulerConfigRecord = {
  syncEnabled: 0,
  syncIntervalMinutes: 60,
  downloadEnabled: 0,
  downloadIntervalMinutes: 60,
  downloadBatchSize: 50,
  alertWebhookUrl: '',
  authKey: null,
  authBoundAt: null,
};

const DEFAULT_STATE: WorkerSchedulerState = {
  syncRunning: false,
  downloadRunning: false,
  lastSyncStartedAt: null,
  lastSyncFinishedAt: null,
  lastSyncSummary: '',
  lastSyncError: '',
  nextSyncAt: null,
  lastDownloadStartedAt: null,
  lastDownloadFinishedAt: null,
  lastDownloadSummary: '',
  lastDownloadError: '',
  nextDownloadAt: null,
};

let sqlitePromise: Promise<SqliteApi> | null = null;

function toBoolean(value: number | null | undefined) {
  return value === 1;
}

function normalizeNullableNumber(value: number | null | undefined) {
  return value ?? null;
}

function getSchedulerDbPath() {
  return process.env.WORKER_SQLITE_PATH || '.data/worker-scheduler.db';
}

async function getSqlite() {
  if (!sqlitePromise) {
    sqlitePromise = (async () => {
      const [{ DatabaseSync }, fs, path] = await Promise.all([
        import('node:sqlite'),
        import('node:fs'),
        import('node:path'),
      ]);

      const dbPath = path.resolve(process.cwd(), getSchedulerDbPath());
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      const db = new DatabaseSync(dbPath);
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS worker_scheduler_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          sync_enabled INTEGER NOT NULL DEFAULT 0,
          sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
          download_enabled INTEGER NOT NULL DEFAULT 0,
          download_interval_minutes INTEGER NOT NULL DEFAULT 60,
          download_batch_size INTEGER NOT NULL DEFAULT 50,
          alert_webhook_url TEXT NOT NULL DEFAULT '',
          auth_key TEXT,
          auth_bound_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS worker_scheduler_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          sync_running INTEGER NOT NULL DEFAULT 0,
          download_running INTEGER NOT NULL DEFAULT 0,
          last_sync_started_at INTEGER,
          last_sync_finished_at INTEGER,
          last_sync_summary TEXT NOT NULL DEFAULT '',
          last_sync_error TEXT NOT NULL DEFAULT '',
          next_sync_at INTEGER,
          last_download_started_at INTEGER,
          last_download_finished_at INTEGER,
          last_download_summary TEXT NOT NULL DEFAULT '',
          last_download_error TEXT NOT NULL DEFAULT '',
          next_download_at INTEGER,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS worker_accounts (
          fakeid TEXT PRIMARY KEY,
          nickname TEXT,
          round_head_img TEXT,
          total_count INTEGER NOT NULL DEFAULT 0,
          article_count INTEGER NOT NULL DEFAULT 0,
          message_count INTEGER NOT NULL DEFAULT 0,
          last_sync_at INTEGER,
          last_article_time INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS worker_articles (
          id TEXT PRIMARY KEY,
          fakeid TEXT NOT NULL,
          aid TEXT NOT NULL,
          title TEXT NOT NULL,
          link TEXT NOT NULL UNIQUE,
          cover TEXT,
          digest TEXT,
          create_time INTEGER NOT NULL,
          update_time INTEGER NOT NULL,
          itemidx INTEGER NOT NULL,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT '',
          html_downloaded INTEGER NOT NULL DEFAULT 0,
          html_path TEXT,
          html_updated_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (fakeid) REFERENCES worker_accounts(fakeid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_worker_articles_fakeid_create_time
          ON worker_articles(fakeid, create_time DESC);
        CREATE INDEX IF NOT EXISTS idx_worker_articles_pending_html
          ON worker_articles(html_downloaded, is_deleted, update_time DESC);
      `);

      const configColumns = db
        .prepare<{ name: string }>('PRAGMA table_info(worker_scheduler_config)')
        .all()
        .map(column => column.name);
      if (!configColumns.includes('alert_webhook_url')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN alert_webhook_url TEXT NOT NULL DEFAULT ''`);
      }

      const now = Date.now();
      db.prepare(
        `
          INSERT OR IGNORE INTO worker_scheduler_config (
            id, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
            download_batch_size, alert_webhook_url, auth_key, auth_bound_at, created_at, updated_at
          ) VALUES (1, 0, 60, 0, 60, 50, '', NULL, NULL, ?, ?)
        `
      ).run(now, now);
      db.prepare(
        `
          INSERT OR IGNORE INTO worker_scheduler_state (
            id, sync_running, download_running, last_sync_started_at, last_sync_finished_at,
            last_sync_summary, last_sync_error, next_sync_at, last_download_started_at,
            last_download_finished_at, last_download_summary, last_download_error,
            next_download_at, updated_at
          ) VALUES (1, 0, 0, NULL, NULL, '', '', NULL, NULL, NULL, '', '', NULL, ?)
        `
      ).run(now);

      return {
        all<T>(sql: string, params: unknown[] = []) {
          return db.prepare(sql).all(...params) as T[];
        },
        get<T>(sql: string, params: unknown[] = []) {
          return db.prepare(sql).get(...params) as T | undefined;
        },
        run(sql: string, params: unknown[] = []) {
          const result = db.prepare(sql).run(...params);
          return { changes: Number(result.changes || 0) };
        },
        exec(sql: string) {
          db.exec(sql);
        },
      } satisfies SqliteApi;
    })();
  }

  return sqlitePromise;
}

function mapConfig(row?: SchedulerConfigRecord): WorkerSchedulerConfig {
  const record = row || DEFAULT_CONFIG;
  return {
    syncEnabled: toBoolean(record.syncEnabled),
    syncIntervalMinutes: record.syncIntervalMinutes,
    downloadEnabled: toBoolean(record.downloadEnabled),
    downloadIntervalMinutes: record.downloadIntervalMinutes,
    downloadBatchSize: record.downloadBatchSize,
    alertWebhookUrl: record.alertWebhookUrl || '',
    authBound: Boolean(record.authKey),
    authBoundAt: normalizeNullableNumber(record.authBoundAt),
  };
}

function mapState(row?: Record<string, string | number | null>): WorkerSchedulerState {
  if (!row) {
    return { ...DEFAULT_STATE };
  }

  return {
    syncRunning: toBoolean(Number(row.sync_running || 0)),
    downloadRunning: toBoolean(Number(row.download_running || 0)),
    lastSyncStartedAt: normalizeNullableNumber(Number(row.last_sync_started_at || 0) || null),
    lastSyncFinishedAt: normalizeNullableNumber(Number(row.last_sync_finished_at || 0) || null),
    lastSyncSummary: String(row.last_sync_summary || ''),
    lastSyncError: String(row.last_sync_error || ''),
    nextSyncAt: normalizeNullableNumber(Number(row.next_sync_at || 0) || null),
    lastDownloadStartedAt: normalizeNullableNumber(Number(row.last_download_started_at || 0) || null),
    lastDownloadFinishedAt: normalizeNullableNumber(Number(row.last_download_finished_at || 0) || null),
    lastDownloadSummary: String(row.last_download_summary || ''),
    lastDownloadError: String(row.last_download_error || ''),
    nextDownloadAt: normalizeNullableNumber(Number(row.next_download_at || 0) || null),
  };
}

export async function getSchedulerConfig() {
  const sqlite = await getSqlite();
  return mapConfig(
    sqlite.get<SchedulerConfigRecord>(
      `
        SELECT sync_enabled as syncEnabled,
               sync_interval_minutes as syncIntervalMinutes,
               download_enabled as downloadEnabled,
               download_interval_minutes as downloadIntervalMinutes,
               download_batch_size as downloadBatchSize,
               alert_webhook_url as alertWebhookUrl,
               auth_key as authKey,
               auth_bound_at as authBoundAt
        FROM worker_scheduler_config
        WHERE id = 1
      `
    )
  );
}

export async function getSchedulerAuthKey() {
  const sqlite = await getSqlite();
  const row = sqlite.get<{ auth_key: string | null }>('SELECT auth_key FROM worker_scheduler_config WHERE id = 1');
  return row?.auth_key || null;
}

export async function updateSchedulerConfig(
  patch: Partial<WorkerSchedulerConfig> & { authKey?: string | null; authBoundAt?: number | null }
) {
  const sqlite = await getSqlite();
  const current = sqlite.get<{
    sync_enabled: number;
    sync_interval_minutes: number;
    download_enabled: number;
    download_interval_minutes: number;
    download_batch_size: number;
    alert_webhook_url: string | null;
    auth_key: string | null;
    auth_bound_at: number | null;
  }>('SELECT * FROM worker_scheduler_config WHERE id = 1');

  const next = {
    syncEnabled: patch.syncEnabled ?? toBoolean(current?.sync_enabled),
    syncIntervalMinutes: patch.syncIntervalMinutes ?? current?.sync_interval_minutes ?? 60,
    downloadEnabled: patch.downloadEnabled ?? toBoolean(current?.download_enabled),
    downloadIntervalMinutes: patch.downloadIntervalMinutes ?? current?.download_interval_minutes ?? 60,
    downloadBatchSize: patch.downloadBatchSize ?? current?.download_batch_size ?? 50,
    alertWebhookUrl: patch.alertWebhookUrl === undefined ? current?.alert_webhook_url || '' : patch.alertWebhookUrl,
    authKey: patch.authKey === undefined ? current?.auth_key || null : patch.authKey,
    authBoundAt: patch.authBoundAt === undefined ? current?.auth_bound_at || null : patch.authBoundAt,
  };

  const now = Date.now();
  sqlite.run(
    `
      UPDATE worker_scheduler_config
      SET sync_enabled = ?,
          sync_interval_minutes = ?,
          download_enabled = ?,
          download_interval_minutes = ?,
          download_batch_size = ?,
          alert_webhook_url = ?,
          auth_key = ?,
          auth_bound_at = ?,
          updated_at = ?
      WHERE id = 1
    `,
    [
      next.syncEnabled ? 1 : 0,
      Math.max(1, Number(next.syncIntervalMinutes) || 60),
      next.downloadEnabled ? 1 : 0,
      Math.max(1, Number(next.downloadIntervalMinutes) || 60),
      Math.max(1, Number(next.downloadBatchSize) || 50),
      next.alertWebhookUrl.trim(),
      next.authKey,
      next.authBoundAt,
      now,
    ]
  );

  return getSchedulerConfig();
}

export async function getSchedulerState() {
  const sqlite = await getSqlite();
  return mapState(
    sqlite.get<Record<string, string | number | null>>('SELECT * FROM worker_scheduler_state WHERE id = 1')
  );
}

export async function updateSchedulerState(patch: Partial<WorkerSchedulerState>) {
  const sqlite = await getSqlite();
  const current = await getSchedulerState();
  const next = {
    ...current,
    ...patch,
  };

  sqlite.run(
    `
      UPDATE worker_scheduler_state
      SET sync_running = ?,
          download_running = ?,
          last_sync_started_at = ?,
          last_sync_finished_at = ?,
          last_sync_summary = ?,
          last_sync_error = ?,
          next_sync_at = ?,
          last_download_started_at = ?,
          last_download_finished_at = ?,
          last_download_summary = ?,
          last_download_error = ?,
          next_download_at = ?,
          updated_at = ?
      WHERE id = 1
    `,
    [
      next.syncRunning ? 1 : 0,
      next.downloadRunning ? 1 : 0,
      next.lastSyncStartedAt,
      next.lastSyncFinishedAt,
      next.lastSyncSummary,
      next.lastSyncError,
      next.nextSyncAt,
      next.lastDownloadStartedAt,
      next.lastDownloadFinishedAt,
      next.lastDownloadSummary,
      next.lastDownloadError,
      next.nextDownloadAt,
      Date.now(),
    ]
  );

  return next;
}

export async function getSchedulerStats(): Promise<WorkerSchedulerStats> {
  const sqlite = await getSqlite();
  return {
    trackedAccounts: sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_accounts')?.count || 0,
    trackedArticles: sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_articles')?.count || 0,
    downloadedHtmlArticles:
      sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_articles WHERE html_downloaded = 1')?.count ||
      0,
  };
}

export async function getSchedulerSnapshot(): Promise<WorkerSchedulerSnapshot> {
  const [config, state, stats] = await Promise.all([getSchedulerConfig(), getSchedulerState(), getSchedulerStats()]);
  return { config, state, stats };
}

export async function upsertTrackedAccounts(accounts: MpAccount[]) {
  const sqlite = await getSqlite();
  const now = Date.now();
  for (const account of accounts) {
    sqlite.run(
      `
        INSERT INTO worker_accounts (
          fakeid, nickname, round_head_img, total_count, article_count, message_count, last_sync_at, last_article_time, created_at, updated_at
        ) VALUES (?, ?, ?, 0, 0, 0, NULL, NULL, ?, ?)
        ON CONFLICT(fakeid) DO UPDATE SET
          nickname = excluded.nickname,
          round_head_img = excluded.round_head_img,
          updated_at = excluded.updated_at
      `,
      [account.fakeid, account.nickname || null, account.round_head_img || null, now, now]
    );
  }
}

export async function listTrackedAccounts(): Promise<MpAccount[]> {
  const sqlite = await getSqlite();
  const rows = sqlite.all<WorkerAccountRow>('SELECT * FROM worker_accounts ORDER BY created_at DESC');
  return rows.map(row => ({
    fakeid: row.fakeid,
    nickname: row.nickname || undefined,
    round_head_img: row.round_head_img || undefined,
    completed: false,
    count: row.message_count,
    articles: row.article_count,
    total_count: row.total_count,
    create_time: Math.floor(row.created_at / 1000),
    update_time: row.last_sync_at ? Math.floor(row.last_sync_at / 1000) : undefined,
    last_update_time: row.last_article_time || undefined,
  }));
}

export async function removeTrackedAccounts(fakeids: string[]) {
  if (fakeids.length === 0) {
    return;
  }

  const sqlite = await getSqlite();
  const placeholders = fakeids.map(() => '?').join(', ');
  const rows = sqlite.all<{ html_path: string | null }>(
    `SELECT html_path FROM worker_articles WHERE fakeid IN (${placeholders}) AND html_path IS NOT NULL`,
    fakeids
  );
  const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  for (const row of rows) {
    if (!row.html_path) continue;
    const target = path.resolve(process.cwd(), row.html_path);
    await fs.unlink(target).catch(() => {});
  }

  sqlite.run(`DELETE FROM worker_articles WHERE fakeid IN (${placeholders})`, fakeids);
  sqlite.run(`DELETE FROM worker_accounts WHERE fakeid IN (${placeholders})`, fakeids);
}

export async function upsertAccountArticles(
  account: MpAccount,
  totalCount: number,
  articles: AppMsgEx[]
): Promise<{ inserted: number; updated: number }> {
  const sqlite = await getSqlite();
  const now = Date.now();
  let inserted = 0;
  let updated = 0;

  for (const article of articles) {
    const articleId = `${account.fakeid}:${article.aid}`;
    const existed = sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_articles WHERE id = ?', [
      articleId,
    ]);

    sqlite.run(
      `
        INSERT INTO worker_articles (
          id, fakeid, aid, title, link, cover, digest, create_time, update_time, itemidx,
          is_deleted, status, html_downloaded, html_path, html_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, NULL, NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          link = excluded.link,
          cover = excluded.cover,
          digest = excluded.digest,
          create_time = excluded.create_time,
          update_time = excluded.update_time,
          itemidx = excluded.itemidx,
          is_deleted = excluded.is_deleted,
          updated_at = excluded.updated_at
      `,
      [
        articleId,
        account.fakeid,
        article.aid,
        article.title,
        article.link,
        article.cover || '',
        article.digest || '',
        article.create_time,
        article.update_time,
        article.itemidx,
        article.is_deleted ? 1 : 0,
        now,
        now,
      ]
    );

    if (existed?.count) {
      updated++;
    } else {
      inserted++;
    }
  }

  sqlite.run(
    `
      UPDATE worker_accounts
      SET nickname = ?,
          round_head_img = ?,
          total_count = ?,
          article_count = (
            SELECT COUNT(*) FROM worker_articles WHERE fakeid = ?
          ),
          message_count = (
            SELECT COUNT(*) FROM worker_articles WHERE fakeid = ? AND itemidx = 1
          ),
          last_sync_at = ?,
          last_article_time = (
            SELECT MAX(create_time) FROM worker_articles WHERE fakeid = ?
          ),
          updated_at = ?
      WHERE fakeid = ?
    `,
    [
      account.nickname || null,
      account.round_head_img || null,
      totalCount,
      account.fakeid,
      account.fakeid,
      now,
      account.fakeid,
      now,
      account.fakeid,
    ]
  );

  return { inserted, updated };
}

export async function listPendingHtmlArticles(limit: number): Promise<PendingHtmlArticleRow[]> {
  const sqlite = await getSqlite();
  return sqlite.all<PendingHtmlArticleRow>(
    `
      SELECT id, fakeid, aid, title, link
      FROM worker_articles
      WHERE is_deleted = 0
        AND html_downloaded = 0
      ORDER BY update_time DESC, create_time DESC
      LIMIT ?
    `,
    [Math.max(1, limit)]
  );
}

export async function markArticleHtmlDownloaded(articleId: string, htmlPath: string) {
  const sqlite = await getSqlite();
  sqlite.run(
    `
      UPDATE worker_articles
      SET html_downloaded = 1,
          html_path = ?,
          html_updated_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [htmlPath, Date.now(), Date.now(), articleId]
  );
}

export async function markArticleDeleted(articleId: string) {
  const sqlite = await getSqlite();
  sqlite.run(
    `
      UPDATE worker_articles
      SET is_deleted = 1,
          updated_at = ?
      WHERE id = ?
    `,
    [Date.now(), articleId]
  );
}
