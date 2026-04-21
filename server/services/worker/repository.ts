import Database from 'better-sqlite3';
import type { MpAccount } from '~/store/v2/info';
import type { AppMsgEx } from '~/types/types';
import type {
  WorkerSchedulerConfig,
  WorkerSchedulerSnapshot,
  WorkerSchedulerState,
  WorkerSchedulerStats,
} from '~/types/worker-scheduler';
import {
  normalizeScheduledExportDate,
  normalizeScheduledExportDateRangeType,
  normalizeScheduledExportRecentDays,
  normalizeSelectedAccountFakeids,
  normalizeSelectedExportFormats,
  parseStoredStringArray,
} from './config-helpers.js';

interface SchedulerConfigRecord {
  syncEnabled: number;
  syncIntervalMinutes: number;
  downloadEnabled: number;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  downloadDateRangeType: string | null;
  downloadRecentDays: number | null;
  downloadDateStart: string | null;
  downloadDateEnd: string | null;
  alertWebhookUrl: string | null;
  authKey: string | null;
  authBoundAt: number | null;
  selectedAccountFakeids: string | null;
  selectedExportFormats: string | null;
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

interface WorkerArticleRow {
  id: string;
  fakeid: string;
  aid: string;
  title: string;
  link: string;
  cover: string | null;
  digest: string | null;
  create_time: number;
  update_time: number;
  itemidx: number;
  is_deleted: number;
  status: string | null;
  author_name?: string | null;
  album_id?: string | null;
  appmsg_album_infos?: string | null;
  appmsgid?: number | null;
  ban_flag?: number | null;
  checking?: number | null;
  copyright_stat?: number | null;
  copyright_type?: number | null;
  has_red_packet_cover?: number | null;
  is_pay_subscribe?: number | null;
  item_show_type?: number | null;
  media_duration?: string | null;
  mediaapi_publish_status?: number | null;
  pic_cdn_url_1_1?: string | null;
  pic_cdn_url_3_4?: string | null;
  pic_cdn_url_16_9?: string | null;
  pic_cdn_url_235_1?: string | null;
  html_downloaded?: number;
  html_path?: string | null;
  html_updated_at?: number | null;
}

interface WorkerArticleHtmlRow {
  aid: string;
  fakeid: string;
  link: string;
  title: string;
  html_path: string | null;
  html_updated_at: number | null;
}

interface SqliteApi {
  all<T>(sql: string, params?: any[]): T[];
  get<T>(sql: string, params?: any[]): T | undefined;
  run(sql: string, params?: any[]): { changes: number };
  exec(sql: string): void;
}

const DEFAULT_CONFIG: SchedulerConfigRecord = {
  syncEnabled: 0,
  syncIntervalMinutes: 60,
  downloadEnabled: 0,
  downloadIntervalMinutes: 60,
  downloadBatchSize: 50,
  downloadDateRangeType: 'all',
  downloadRecentDays: 3,
  downloadDateStart: '',
  downloadDateEnd: '',
  alertWebhookUrl: '',
  authKey: null,
  authBoundAt: null,
  selectedAccountFakeids: '[]',
  selectedExportFormats: '[]',
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

const DEFAULT_WORKER_SCOPE = '__default__';
const LEGACY_GLOBAL_SCOPE_MIGRATION_KEY = 'legacy-global-scope-migrated';

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
      const [fs, path] = await Promise.all([import('node:fs'), import('node:path')]);

      const dbPath = path.resolve(process.cwd(), getSchedulerDbPath());
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      const db = new Database(dbPath);
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
          download_date_range_type TEXT NOT NULL DEFAULT 'all',
          download_recent_days INTEGER NOT NULL DEFAULT 3,
          download_date_start TEXT NOT NULL DEFAULT '',
          download_date_end TEXT NOT NULL DEFAULT '',
          alert_webhook_url TEXT NOT NULL DEFAULT '',
          auth_key TEXT,
          auth_bound_at INTEGER,
          selected_account_fakeids TEXT NOT NULL DEFAULT '[]',
          selected_export_formats TEXT NOT NULL DEFAULT '[]',
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

        CREATE TABLE IF NOT EXISTS worker_scope_scheduler_config (
          scope_id TEXT PRIMARY KEY,
          sync_enabled INTEGER NOT NULL DEFAULT 0,
          sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
          download_enabled INTEGER NOT NULL DEFAULT 0,
          download_interval_minutes INTEGER NOT NULL DEFAULT 60,
          download_batch_size INTEGER NOT NULL DEFAULT 50,
          download_date_range_type TEXT NOT NULL DEFAULT 'all',
          download_recent_days INTEGER NOT NULL DEFAULT 3,
          download_date_start TEXT NOT NULL DEFAULT '',
          download_date_end TEXT NOT NULL DEFAULT '',
          alert_webhook_url TEXT NOT NULL DEFAULT '',
          auth_key TEXT,
          auth_bound_at INTEGER,
          selected_account_fakeids TEXT NOT NULL DEFAULT '[]',
          selected_export_formats TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS worker_scope_scheduler_state (
          scope_id TEXT PRIMARY KEY,
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

        CREATE TABLE IF NOT EXISTS worker_scope_accounts (
          scope_id TEXT NOT NULL,
          fakeid TEXT NOT NULL,
          nickname TEXT,
          round_head_img TEXT,
          total_count INTEGER NOT NULL DEFAULT 0,
          article_count INTEGER NOT NULL DEFAULT 0,
          message_count INTEGER NOT NULL DEFAULT 0,
          last_sync_at INTEGER,
          last_article_time INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (scope_id, fakeid)
        );

        CREATE TABLE IF NOT EXISTS worker_scope_articles (
          scoped_id TEXT PRIMARY KEY,
          scope_id TEXT NOT NULL,
          id TEXT NOT NULL,
          fakeid TEXT NOT NULL,
          aid TEXT NOT NULL,
          title TEXT NOT NULL,
          link TEXT NOT NULL,
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
          author_name TEXT NOT NULL DEFAULT '',
          album_id TEXT NOT NULL DEFAULT '',
          appmsg_album_infos TEXT NOT NULL DEFAULT '[]',
          appmsgid INTEGER NOT NULL DEFAULT 0,
          ban_flag INTEGER NOT NULL DEFAULT 0,
          checking INTEGER NOT NULL DEFAULT 0,
          copyright_stat INTEGER NOT NULL DEFAULT 0,
          copyright_type INTEGER NOT NULL DEFAULT 0,
          has_red_packet_cover INTEGER NOT NULL DEFAULT 0,
          is_pay_subscribe INTEGER NOT NULL DEFAULT 0,
          item_show_type INTEGER NOT NULL DEFAULT 0,
          media_duration TEXT NOT NULL DEFAULT '',
          mediaapi_publish_status INTEGER NOT NULL DEFAULT 0,
          pic_cdn_url_1_1 TEXT NOT NULL DEFAULT '',
          pic_cdn_url_3_4 TEXT NOT NULL DEFAULT '',
          pic_cdn_url_16_9 TEXT NOT NULL DEFAULT '',
          pic_cdn_url_235_1 TEXT NOT NULL DEFAULT '',
          UNIQUE (scope_id, id),
          UNIQUE (scope_id, link),
          FOREIGN KEY (scope_id, fakeid) REFERENCES worker_scope_accounts(scope_id, fakeid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_worker_scope_articles_fakeid_create_time
          ON worker_scope_articles(scope_id, fakeid, create_time DESC);
        CREATE INDEX IF NOT EXISTS idx_worker_scope_articles_pending_html
          ON worker_scope_articles(scope_id, html_downloaded, is_deleted, update_time DESC);

        CREATE TABLE IF NOT EXISTS worker_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL DEFAULT '',
          updated_at INTEGER NOT NULL
        );
      `);

      const articleColumns = (db.prepare('PRAGMA table_info(worker_articles)').all() as Array<{ name: string }>).map(
        column => column.name
      );
      const missingArticleColumns = [
        ['author_name', "TEXT NOT NULL DEFAULT ''"],
        ['album_id', "TEXT NOT NULL DEFAULT ''"],
        ['appmsg_album_infos', "TEXT NOT NULL DEFAULT '[]'"],
        ['appmsgid', 'INTEGER NOT NULL DEFAULT 0'],
        ['ban_flag', 'INTEGER NOT NULL DEFAULT 0'],
        ['checking', 'INTEGER NOT NULL DEFAULT 0'],
        ['copyright_stat', 'INTEGER NOT NULL DEFAULT 0'],
        ['copyright_type', 'INTEGER NOT NULL DEFAULT 0'],
        ['has_red_packet_cover', 'INTEGER NOT NULL DEFAULT 0'],
        ['is_pay_subscribe', 'INTEGER NOT NULL DEFAULT 0'],
        ['item_show_type', 'INTEGER NOT NULL DEFAULT 0'],
        ['media_duration', "TEXT NOT NULL DEFAULT ''"],
        ['mediaapi_publish_status', 'INTEGER NOT NULL DEFAULT 0'],
        ['pic_cdn_url_1_1', "TEXT NOT NULL DEFAULT ''"],
        ['pic_cdn_url_3_4', "TEXT NOT NULL DEFAULT ''"],
        ['pic_cdn_url_16_9', "TEXT NOT NULL DEFAULT ''"],
        ['pic_cdn_url_235_1', "TEXT NOT NULL DEFAULT ''"],
      ] as const;
      for (const [name, definition] of missingArticleColumns) {
        if (!articleColumns.includes(name)) {
          db.exec(`ALTER TABLE worker_articles ADD COLUMN ${name} ${definition}`);
        }
      }

      const configColumns = (
        db.prepare('PRAGMA table_info(worker_scheduler_config)').all() as Array<{ name: string }>
      ).map(column => column.name);
      if (!configColumns.includes('alert_webhook_url')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN alert_webhook_url TEXT NOT NULL DEFAULT ''`);
      }
      if (!configColumns.includes('selected_account_fakeids')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN selected_account_fakeids TEXT NOT NULL DEFAULT '[]'`);
      }
      if (!configColumns.includes('selected_export_formats')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN selected_export_formats TEXT NOT NULL DEFAULT '[]'`);
      }
      if (!configColumns.includes('download_date_range_type')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN download_date_range_type TEXT NOT NULL DEFAULT 'all'`);
      }
      if (!configColumns.includes('download_recent_days')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN download_recent_days INTEGER NOT NULL DEFAULT 3`);
      }
      if (!configColumns.includes('download_date_start')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN download_date_start TEXT NOT NULL DEFAULT ''`);
      }
      if (!configColumns.includes('download_date_end')) {
        db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN download_date_end TEXT NOT NULL DEFAULT ''`);
      }

      const now = Date.now();
      db.prepare(
        `
        INSERT OR IGNORE INTO worker_scheduler_config (
            id, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
            download_batch_size, download_date_range_type, download_recent_days, download_date_start, download_date_end,
            alert_webhook_url, auth_key, auth_bound_at, selected_account_fakeids, selected_export_formats, created_at, updated_at
          ) VALUES (1, 0, 60, 0, 60, 50, 'all', 3, '', '', '', NULL, NULL, '[]', '[]', ?, ?)
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
        all<T>(sql: string, params: any[] = []) {
          return db.prepare(sql).all(...params) as T[];
        },
        get<T>(sql: string, params: any[] = []) {
          return db.prepare(sql).get(...params) as T | undefined;
        },
        run(sql: string, params: any[] = []) {
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
    downloadDateRangeType: normalizeScheduledExportDateRangeType(record.downloadDateRangeType),
    downloadRecentDays: normalizeScheduledExportRecentDays(record.downloadRecentDays),
    downloadDateStart: normalizeScheduledExportDate(record.downloadDateStart),
    downloadDateEnd: normalizeScheduledExportDate(record.downloadDateEnd),
    alertWebhookUrl: record.alertWebhookUrl || '',
    authBound: Boolean(record.authKey),
    authBoundAt: normalizeNullableNumber(record.authBoundAt),
    selectedAccountFakeids: normalizeSelectedAccountFakeids(parseStoredStringArray(record.selectedAccountFakeids)),
    selectedExportFormats: normalizeSelectedExportFormats(parseStoredStringArray(record.selectedExportFormats)),
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

function normalizeWorkerScopeId(scopeId?: string | null) {
  if (!scopeId || !scopeId.trim()) {
    return DEFAULT_WORKER_SCOPE;
  }

  return scopeId.trim();
}

function buildScopedArticleKey(scopeId: string, fakeid: string, aid: string) {
  return `${scopeId}::${fakeid}:${aid}`;
}

async function ensureScopedSchedulerRows(sqlite: SqliteApi, scopeId: string) {
  const now = Date.now();
  sqlite.run(
    `
      INSERT OR IGNORE INTO worker_scope_scheduler_config (
        scope_id, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
        download_batch_size, download_date_range_type, download_recent_days, download_date_start, download_date_end,
        alert_webhook_url, auth_key, auth_bound_at, selected_account_fakeids, selected_export_formats, created_at, updated_at
      ) VALUES (?, 0, 60, 0, 60, 50, 'all', 3, '', '', '', NULL, NULL, '[]', '[]', ?, ?)
    `,
    [scopeId, now, now]
  );
  sqlite.run(
    `
      INSERT OR IGNORE INTO worker_scope_scheduler_state (
        scope_id, sync_running, download_running, last_sync_started_at, last_sync_finished_at,
        last_sync_summary, last_sync_error, next_sync_at, last_download_started_at,
        last_download_finished_at, last_download_summary, last_download_error,
        next_download_at, updated_at
      ) VALUES (?, 0, 0, NULL, NULL, '', '', NULL, NULL, NULL, '', '', NULL, ?)
    `,
    [scopeId, now]
  );
}

function hasMeaningfulLegacySchedulerConfig(row?: {
  sync_enabled: number;
  download_enabled: number;
  alert_webhook_url: string | null;
  auth_key: string | null;
  selected_account_fakeids: string | null;
  selected_export_formats: string | null;
}) {
  if (!row) {
    return false;
  }

  return Boolean(
    row.sync_enabled ||
      row.download_enabled ||
      (row.alert_webhook_url || '').trim() ||
      (row.auth_key || '').trim() ||
      row.selected_account_fakeids !== '[]' ||
      row.selected_export_formats !== '[]'
  );
}

async function migrateLegacyGlobalScopeIfNeeded(sqlite: SqliteApi, scopeId: string) {
  if (scopeId === DEFAULT_WORKER_SCOPE) {
    return;
  }

  const migrationMarker = sqlite.get<{ value: string }>('SELECT value FROM worker_meta WHERE key = ?', [
    LEGACY_GLOBAL_SCOPE_MIGRATION_KEY,
  ]);
  if (migrationMarker?.value) {
    return;
  }

  const legacyConfig = sqlite.get<{
    sync_enabled: number;
    sync_interval_minutes: number;
    download_enabled: number;
    download_interval_minutes: number;
    download_batch_size: number;
    download_date_range_type: string | null;
    download_recent_days: number | null;
    download_date_start: string | null;
    download_date_end: string | null;
    alert_webhook_url: string | null;
    auth_key: string | null;
    auth_bound_at: number | null;
    selected_account_fakeids: string | null;
    selected_export_formats: string | null;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM worker_scheduler_config WHERE id = 1');
  const legacyAuthKey = legacyConfig?.auth_key?.trim() || null;
  if (legacyAuthKey && legacyAuthKey !== scopeId) {
    return;
  }

  const legacyAccountCount = sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_accounts')?.count || 0;
  const legacyArticleCount = sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_articles')?.count || 0;
  const hasLegacyData =
    legacyAccountCount > 0 || legacyArticleCount > 0 || hasMeaningfulLegacySchedulerConfig(legacyConfig);
  if (!hasLegacyData) {
    return;
  }

  sqlite.run(
    `
      INSERT INTO worker_scope_scheduler_config (
        scope_id, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
        download_batch_size, download_date_range_type, download_recent_days, download_date_start, download_date_end,
        alert_webhook_url, auth_key, auth_bound_at, selected_account_fakeids, selected_export_formats, created_at, updated_at
      )
      SELECT ?, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
             download_batch_size, download_date_range_type, download_recent_days, download_date_start, download_date_end,
             alert_webhook_url, auth_key, auth_bound_at, selected_account_fakeids, selected_export_formats, created_at, updated_at
      FROM worker_scheduler_config
      WHERE id = 1
      ON CONFLICT(scope_id) DO UPDATE SET
        sync_enabled = excluded.sync_enabled,
        sync_interval_minutes = excluded.sync_interval_minutes,
        download_enabled = excluded.download_enabled,
        download_interval_minutes = excluded.download_interval_minutes,
        download_batch_size = excluded.download_batch_size,
        download_date_range_type = excluded.download_date_range_type,
        download_recent_days = excluded.download_recent_days,
        download_date_start = excluded.download_date_start,
        download_date_end = excluded.download_date_end,
        alert_webhook_url = excluded.alert_webhook_url,
        auth_key = excluded.auth_key,
        auth_bound_at = excluded.auth_bound_at,
        selected_account_fakeids = excluded.selected_account_fakeids,
        selected_export_formats = excluded.selected_export_formats,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [scopeId]
  );

  sqlite.run(
    `
      INSERT INTO worker_scope_scheduler_state (
        scope_id, sync_running, download_running, last_sync_started_at, last_sync_finished_at,
        last_sync_summary, last_sync_error, next_sync_at, last_download_started_at,
        last_download_finished_at, last_download_summary, last_download_error,
        next_download_at, updated_at
      )
      SELECT ?, sync_running, download_running, last_sync_started_at, last_sync_finished_at,
             last_sync_summary, last_sync_error, next_sync_at, last_download_started_at,
             last_download_finished_at, last_download_summary, last_download_error,
             next_download_at, updated_at
      FROM worker_scheduler_state
      WHERE id = 1
      ON CONFLICT(scope_id) DO UPDATE SET
        sync_running = excluded.sync_running,
        download_running = excluded.download_running,
        last_sync_started_at = excluded.last_sync_started_at,
        last_sync_finished_at = excluded.last_sync_finished_at,
        last_sync_summary = excluded.last_sync_summary,
        last_sync_error = excluded.last_sync_error,
        next_sync_at = excluded.next_sync_at,
        last_download_started_at = excluded.last_download_started_at,
        last_download_finished_at = excluded.last_download_finished_at,
        last_download_summary = excluded.last_download_summary,
        last_download_error = excluded.last_download_error,
        next_download_at = excluded.next_download_at,
        updated_at = excluded.updated_at
    `,
    [scopeId]
  );

  sqlite.run(
    `
      INSERT INTO worker_scope_accounts (
        scope_id, fakeid, nickname, round_head_img, total_count, article_count, message_count, last_sync_at, last_article_time, created_at, updated_at
      )
      SELECT ?, fakeid, nickname, round_head_img, total_count, article_count, message_count, last_sync_at, last_article_time, created_at, updated_at
      FROM worker_accounts
      WHERE 1 = 1
      ON CONFLICT(scope_id, fakeid) DO UPDATE SET
        nickname = excluded.nickname,
        round_head_img = excluded.round_head_img,
        total_count = excluded.total_count,
        article_count = excluded.article_count,
        message_count = excluded.message_count,
        last_sync_at = excluded.last_sync_at,
        last_article_time = excluded.last_article_time,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [scopeId]
  );

  sqlite.run(
    `
      INSERT INTO worker_scope_articles (
        scoped_id, scope_id, id, fakeid, aid, title, link, cover, digest, create_time, update_time, itemidx,
        is_deleted, status, html_downloaded, html_path, html_updated_at, created_at, updated_at,
        author_name, album_id, appmsg_album_infos, appmsgid, ban_flag, checking, copyright_stat,
        copyright_type, has_red_packet_cover, is_pay_subscribe, item_show_type, media_duration,
        mediaapi_publish_status, pic_cdn_url_1_1, pic_cdn_url_3_4, pic_cdn_url_16_9, pic_cdn_url_235_1
      )
      SELECT ? || '::' || id, ?, id, fakeid, aid, title, link, cover, digest, create_time, update_time, itemidx,
             is_deleted, status, html_downloaded, html_path, html_updated_at, created_at, updated_at,
             author_name, album_id, appmsg_album_infos, appmsgid, ban_flag, checking, copyright_stat,
             copyright_type, has_red_packet_cover, is_pay_subscribe, item_show_type, media_duration,
             mediaapi_publish_status, pic_cdn_url_1_1, pic_cdn_url_3_4, pic_cdn_url_16_9, pic_cdn_url_235_1
      FROM worker_articles
      WHERE 1 = 1
      ON CONFLICT(scoped_id) DO UPDATE SET
        title = excluded.title,
        link = excluded.link,
        cover = excluded.cover,
        digest = excluded.digest,
        create_time = excluded.create_time,
        update_time = excluded.update_time,
        itemidx = excluded.itemidx,
        is_deleted = excluded.is_deleted,
        status = excluded.status,
        html_downloaded = excluded.html_downloaded,
        html_path = excluded.html_path,
        html_updated_at = excluded.html_updated_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        author_name = excluded.author_name,
        album_id = excluded.album_id,
        appmsg_album_infos = excluded.appmsg_album_infos,
        appmsgid = excluded.appmsgid,
        ban_flag = excluded.ban_flag,
        checking = excluded.checking,
        copyright_stat = excluded.copyright_stat,
        copyright_type = excluded.copyright_type,
        has_red_packet_cover = excluded.has_red_packet_cover,
        is_pay_subscribe = excluded.is_pay_subscribe,
        item_show_type = excluded.item_show_type,
        media_duration = excluded.media_duration,
        mediaapi_publish_status = excluded.mediaapi_publish_status,
        pic_cdn_url_1_1 = excluded.pic_cdn_url_1_1,
        pic_cdn_url_3_4 = excluded.pic_cdn_url_3_4,
        pic_cdn_url_16_9 = excluded.pic_cdn_url_16_9,
        pic_cdn_url_235_1 = excluded.pic_cdn_url_235_1
    `,
    [scopeId, scopeId]
  );

  sqlite.run(
    `
      INSERT INTO worker_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    [LEGACY_GLOBAL_SCOPE_MIGRATION_KEY, scopeId, Date.now()]
  );
}

async function ensureWorkerScopeReady(sqlite: SqliteApi, scopeId: string) {
  await migrateLegacyGlobalScopeIfNeeded(sqlite, scopeId);
  await ensureScopedSchedulerRows(sqlite, scopeId);
}

export async function listSchedulerScopeIds(): Promise<string[]> {
  const sqlite = await getSqlite();
  const rows = sqlite.all<{ scope_id: string }>(
    `
      SELECT scope_id
      FROM worker_scope_scheduler_config
      WHERE auth_key IS NOT NULL
         OR sync_enabled = 1
         OR download_enabled = 1
      ORDER BY updated_at DESC
    `
  );
  const scopeIds = new Set(rows.map(row => row.scope_id));
  const migrationMarker = sqlite.get<{ value: string }>('SELECT value FROM worker_meta WHERE key = ?', [
    LEGACY_GLOBAL_SCOPE_MIGRATION_KEY,
  ]);
  if (!migrationMarker?.value) {
    const legacyConfig = sqlite.get<{ auth_key: string | null }>('SELECT auth_key FROM worker_scheduler_config WHERE id = 1');
    const legacyScopeId = legacyConfig?.auth_key?.trim();
    if (legacyScopeId) {
      scopeIds.add(legacyScopeId);
    }
  }
  return [...scopeIds];
}

export async function getSchedulerConfig(scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  return mapConfig(
    sqlite.get<SchedulerConfigRecord>(
      `
        SELECT sync_enabled as syncEnabled,
               sync_interval_minutes as syncIntervalMinutes,
               download_enabled as downloadEnabled,
               download_interval_minutes as downloadIntervalMinutes,
               download_batch_size as downloadBatchSize,
               download_date_range_type as downloadDateRangeType,
               download_recent_days as downloadRecentDays,
               download_date_start as downloadDateStart,
               download_date_end as downloadDateEnd,
               alert_webhook_url as alertWebhookUrl,
               auth_key as authKey,
               auth_bound_at as authBoundAt,
               selected_account_fakeids as selectedAccountFakeids,
               selected_export_formats as selectedExportFormats
        FROM worker_scope_scheduler_config
        WHERE scope_id = ?
      `,
      [resolvedScopeId]
    )
  );
}

export async function getSchedulerAuthKey(scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const row = sqlite.get<{ auth_key: string | null }>(
    'SELECT auth_key FROM worker_scope_scheduler_config WHERE scope_id = ?',
    [resolvedScopeId]
  );
  return row?.auth_key || null;
}

export async function updateSchedulerConfig(
  patch: Partial<WorkerSchedulerConfig> & { authKey?: string | null; authBoundAt?: number | null },
  scopeId?: string | null
) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const current = sqlite.get<{
    sync_enabled: number;
    sync_interval_minutes: number;
    download_enabled: number;
    download_interval_minutes: number;
    download_batch_size: number;
    download_date_range_type: string | null;
    download_recent_days: number | null;
    download_date_start: string | null;
    download_date_end: string | null;
    alert_webhook_url: string | null;
    auth_key: string | null;
    auth_bound_at: number | null;
    selected_account_fakeids: string | null;
    selected_export_formats: string | null;
  }>('SELECT * FROM worker_scope_scheduler_config WHERE scope_id = ?', [resolvedScopeId]);

  const next = {
    syncEnabled: patch.syncEnabled ?? toBoolean(current?.sync_enabled),
    syncIntervalMinutes: patch.syncIntervalMinutes ?? current?.sync_interval_minutes ?? 60,
    downloadEnabled: patch.downloadEnabled ?? toBoolean(current?.download_enabled),
    downloadIntervalMinutes: patch.downloadIntervalMinutes ?? current?.download_interval_minutes ?? 60,
    downloadBatchSize: patch.downloadBatchSize ?? current?.download_batch_size ?? 50,
    downloadDateRangeType:
      patch.downloadDateRangeType === undefined
        ? current?.download_date_range_type || 'all'
        : normalizeScheduledExportDateRangeType(patch.downloadDateRangeType),
    downloadRecentDays:
      patch.downloadRecentDays === undefined
        ? normalizeScheduledExportRecentDays(current?.download_recent_days)
        : normalizeScheduledExportRecentDays(patch.downloadRecentDays),
    downloadDateStart:
      patch.downloadDateStart === undefined
        ? normalizeScheduledExportDate(current?.download_date_start)
        : normalizeScheduledExportDate(patch.downloadDateStart),
    downloadDateEnd:
      patch.downloadDateEnd === undefined
        ? normalizeScheduledExportDate(current?.download_date_end)
        : normalizeScheduledExportDate(patch.downloadDateEnd),
    alertWebhookUrl: patch.alertWebhookUrl === undefined ? current?.alert_webhook_url || '' : patch.alertWebhookUrl,
    authKey: patch.authKey === undefined ? current?.auth_key || null : patch.authKey,
    authBoundAt: patch.authBoundAt === undefined ? current?.auth_bound_at || null : patch.authBoundAt,
    selectedAccountFakeidsJson:
      patch.selectedAccountFakeids === undefined
        ? current?.selected_account_fakeids || '[]'
        : JSON.stringify(normalizeSelectedAccountFakeids(patch.selectedAccountFakeids)),
    selectedExportFormatsJson:
      patch.selectedExportFormats === undefined
        ? current?.selected_export_formats || '[]'
        : JSON.stringify(normalizeSelectedExportFormats(patch.selectedExportFormats)),
  };

  sqlite.run(
    `
      UPDATE worker_scope_scheduler_config
      SET sync_enabled = ?,
          sync_interval_minutes = ?,
          download_enabled = ?,
          download_interval_minutes = ?,
          download_batch_size = ?,
          download_date_range_type = ?,
          download_recent_days = ?,
          download_date_start = ?,
          download_date_end = ?,
          alert_webhook_url = ?,
          auth_key = ?,
          auth_bound_at = ?,
          selected_account_fakeids = ?,
          selected_export_formats = ?,
          updated_at = ?
      WHERE scope_id = ?
    `,
    [
      next.syncEnabled ? 1 : 0,
      Math.max(1, Number(next.syncIntervalMinutes) || 60),
      next.downloadEnabled ? 1 : 0,
      Math.max(1, Number(next.downloadIntervalMinutes) || 60),
      Math.max(1, Number(next.downloadBatchSize) || 50),
      next.downloadDateRangeType,
      next.downloadRecentDays,
      next.downloadDateStart,
      next.downloadDateEnd,
      next.alertWebhookUrl.trim(),
      next.authKey,
      next.authBoundAt,
      next.selectedAccountFakeidsJson,
      next.selectedExportFormatsJson,
      Date.now(),
      resolvedScopeId,
    ]
  );

  return getSchedulerConfig(resolvedScopeId);
}

export async function getSchedulerState(scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  return mapState(
    sqlite.get<Record<string, string | number | null>>(
      'SELECT * FROM worker_scope_scheduler_state WHERE scope_id = ?',
      [resolvedScopeId]
    )
  );
}

export async function updateSchedulerState(patch: Partial<WorkerSchedulerState>, scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const current = await getSchedulerState(resolvedScopeId);
  const next = {
    ...current,
    ...patch,
  };

  sqlite.run(
    `
      UPDATE worker_scope_scheduler_state
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
      WHERE scope_id = ?
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
      resolvedScopeId,
    ]
  );

  return next;
}

export async function getSchedulerStats(scopeId?: string | null): Promise<WorkerSchedulerStats> {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  return {
    trackedAccounts:
      sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_scope_accounts WHERE scope_id = ?', [
        resolvedScopeId,
      ])?.count || 0,
    trackedArticles:
      sqlite.get<{ count: number }>('SELECT COUNT(*) as count FROM worker_scope_articles WHERE scope_id = ?', [
        resolvedScopeId,
      ])?.count || 0,
    downloadedHtmlArticles:
      sqlite.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM worker_scope_articles WHERE scope_id = ? AND html_downloaded = 1',
        [resolvedScopeId]
      )?.count || 0,
  };
}

export async function getSchedulerSnapshot(scopeId?: string | null): Promise<WorkerSchedulerSnapshot> {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const [config, state, stats] = await Promise.all([
    getSchedulerConfig(resolvedScopeId),
    getSchedulerState(resolvedScopeId),
    getSchedulerStats(resolvedScopeId),
  ]);
  return { config, state, stats };
}

export async function upsertTrackedAccounts(accounts: MpAccount[], scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const now = Date.now();
  for (const account of accounts) {
    sqlite.run(
      `
        INSERT INTO worker_scope_accounts (
          scope_id, fakeid, nickname, round_head_img, total_count, article_count, message_count, last_sync_at, last_article_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, 0, NULL, NULL, ?, ?)
        ON CONFLICT(scope_id, fakeid) DO UPDATE SET
          nickname = excluded.nickname,
          round_head_img = excluded.round_head_img,
          updated_at = excluded.updated_at
      `,
      [resolvedScopeId, account.fakeid, account.nickname || null, account.round_head_img || null, now, now]
    );
  }
}

export async function listTrackedAccounts(scopeId?: string | null): Promise<MpAccount[]> {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const rows = sqlite.all<WorkerAccountRow>(
    'SELECT * FROM worker_scope_accounts WHERE scope_id = ? ORDER BY created_at DESC',
    [resolvedScopeId]
  );
  return rows.map(mapWorkerAccountRow);
}

function mapWorkerAccountRow(row: WorkerAccountRow): MpAccount {
  return {
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
  };
}

export async function listTrackedAccountsByFakeids(fakeids: string[], scopeId?: string | null): Promise<MpAccount[]> {
  const normalizedFakeids = normalizeSelectedAccountFakeids(fakeids);
  if (normalizedFakeids.length === 0) {
    return [];
  }

  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const placeholders = normalizedFakeids.map(() => '?').join(', ');
  const rows = sqlite.all<WorkerAccountRow>(
    `SELECT * FROM worker_scope_accounts WHERE scope_id = ? AND fakeid IN (${placeholders})`,
    [resolvedScopeId, ...normalizedFakeids]
  );
  const rowMap = new Map(rows.map(row => [row.fakeid, row]));
  return normalizedFakeids
    .map(fakeid => rowMap.get(fakeid))
    .filter(Boolean)
    .map(row => mapWorkerAccountRow(row!));
}

function mapWorkerArticleRow(row: WorkerArticleRow) {
  return {
    fakeid: row.fakeid,
    aid: row.aid,
    album_id: row.album_id || '',
    appmsg_album_infos: row.appmsg_album_infos ? JSON.parse(row.appmsg_album_infos) : [],
    appmsgid: row.appmsgid || 0,
    author_name: row.author_name || '',
    ban_flag: row.ban_flag || 0,
    checking: row.checking || 0,
    copyright_stat: row.copyright_stat || 0,
    copyright_type: row.copyright_type || 0,
    cover: row.cover || '',
    create_time: row.create_time,
    digest: row.digest || '',
    has_red_packet_cover: row.has_red_packet_cover || 0,
    is_deleted: Boolean(row.is_deleted),
    is_pay_subscribe: row.is_pay_subscribe || 0,
    item_show_type: row.item_show_type || 0,
    itemidx: row.itemidx,
    link: row.link,
    media_duration: row.media_duration || '',
    mediaapi_publish_status: row.mediaapi_publish_status || 0,
    pic_cdn_url_1_1: row.pic_cdn_url_1_1 || '',
    pic_cdn_url_3_4: row.pic_cdn_url_3_4 || '',
    pic_cdn_url_16_9: row.pic_cdn_url_16_9 || '',
    pic_cdn_url_235_1: row.pic_cdn_url_235_1 || '',
    title: row.title,
    update_time: row.update_time,
    _status: row.status || '',
    html_downloaded: Boolean(row.html_downloaded),
    html_updated_at: row.html_updated_at || null,
  };
}

export async function listTrackedArticlesByFakeid(fakeid: string, scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const rows = sqlite.all<WorkerArticleRow>(
    `
      SELECT *
      FROM worker_scope_articles
      WHERE scope_id = ?
        AND fakeid = ?
      ORDER BY create_time DESC, itemidx ASC
    `,
    [resolvedScopeId, fakeid]
  );
  return rows.map(mapWorkerArticleRow);
}

export async function readTrackedArticleHtmlBatch(fakeid: string, aids: string[], scopeId?: string | null) {
  const normalizedAids = [...new Set(aids.map(aid => aid.trim()).filter(Boolean))];
  if (normalizedAids.length === 0) {
    return [];
  }

  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const placeholders = normalizedAids.map(() => '?').join(', ');
  const rows = sqlite.all<WorkerArticleHtmlRow>(
    `
      SELECT aid, fakeid, link, title, html_path, html_updated_at
      FROM worker_scope_articles
      WHERE scope_id = ?
        AND fakeid = ?
        AND aid IN (${placeholders})
        AND html_downloaded = 1
        AND html_path IS NOT NULL
      ORDER BY update_time DESC, create_time DESC
    `,
    [resolvedScopeId, fakeid, ...normalizedAids]
  );

  const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  const htmlList = await Promise.all(
    rows.map(async row => {
      if (!row.html_path) {
        return null;
      }

      try {
        const filePath = path.resolve(process.cwd(), row.html_path);
        const html = await fs.readFile(filePath, 'utf8');
        return {
          aid: row.aid,
          fakeid: row.fakeid,
          link: row.link,
          title: row.title,
          html,
          htmlUpdatedAt: row.html_updated_at || null,
        };
      } catch {
        return null;
      }
    })
  );

  return htmlList.filter(Boolean);
}

export async function removeTrackedAccounts(fakeids: string[], scopeId?: string | null) {
  if (fakeids.length === 0) {
    return;
  }

  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const placeholders = fakeids.map(() => '?').join(', ');
  const rows = sqlite.all<{ html_path: string | null }>(
    `SELECT html_path FROM worker_scope_articles WHERE scope_id = ? AND fakeid IN (${placeholders}) AND html_path IS NOT NULL`,
    [resolvedScopeId, ...fakeids]
  );
  const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  for (const row of rows) {
    if (!row.html_path) continue;
    const target = path.resolve(process.cwd(), row.html_path);
    await fs.unlink(target).catch(() => {});
  }

  sqlite.run(`DELETE FROM worker_scope_articles WHERE scope_id = ? AND fakeid IN (${placeholders})`, [
    resolvedScopeId,
    ...fakeids,
  ]);
  sqlite.run(`DELETE FROM worker_scope_accounts WHERE scope_id = ? AND fakeid IN (${placeholders})`, [
    resolvedScopeId,
    ...fakeids,
  ]);
}

export async function upsertAccountArticles(
  account: MpAccount,
  totalCount: number,
  articles: AppMsgEx[],
  scopeId?: string | null
): Promise<{ inserted: number; updated: number }> {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const now = Date.now();
  let inserted = 0;
  let updated = 0;

  for (const article of articles) {
    const articleId = `${account.fakeid}:${article.aid}`;
    const existed = sqlite.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM worker_scope_articles WHERE scope_id = ? AND id = ?',
      [resolvedScopeId, articleId]
    );

    sqlite.run(
      `
        INSERT INTO worker_scope_articles (
          scoped_id, scope_id, id, fakeid, aid, title, link, cover, digest, create_time, update_time, itemidx,
          is_deleted, status, html_downloaded, html_path, html_updated_at, created_at, updated_at,
          author_name, album_id, appmsg_album_infos, appmsgid, ban_flag, checking, copyright_stat,
          copyright_type, has_red_packet_cover, is_pay_subscribe, item_show_type, media_duration,
          mediaapi_publish_status, pic_cdn_url_1_1, pic_cdn_url_3_4, pic_cdn_url_16_9, pic_cdn_url_235_1
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(scoped_id) DO UPDATE SET
          title = excluded.title,
          link = excluded.link,
          cover = excluded.cover,
          digest = excluded.digest,
          create_time = excluded.create_time,
          update_time = excluded.update_time,
          itemidx = excluded.itemidx,
          is_deleted = excluded.is_deleted,
          author_name = excluded.author_name,
          album_id = excluded.album_id,
          appmsg_album_infos = excluded.appmsg_album_infos,
          appmsgid = excluded.appmsgid,
          ban_flag = excluded.ban_flag,
          checking = excluded.checking,
          copyright_stat = excluded.copyright_stat,
          copyright_type = excluded.copyright_type,
          has_red_packet_cover = excluded.has_red_packet_cover,
          is_pay_subscribe = excluded.is_pay_subscribe,
          item_show_type = excluded.item_show_type,
          media_duration = excluded.media_duration,
          mediaapi_publish_status = excluded.mediaapi_publish_status,
          pic_cdn_url_1_1 = excluded.pic_cdn_url_1_1,
          pic_cdn_url_3_4 = excluded.pic_cdn_url_3_4,
          pic_cdn_url_16_9 = excluded.pic_cdn_url_16_9,
          pic_cdn_url_235_1 = excluded.pic_cdn_url_235_1,
          updated_at = excluded.updated_at
      `,
      [
        buildScopedArticleKey(resolvedScopeId, account.fakeid, article.aid),
        resolvedScopeId,
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
        article.author_name || '',
        article.album_id || '',
        JSON.stringify(article.appmsg_album_infos || []),
        article.appmsgid || 0,
        article.ban_flag || 0,
        article.checking || 0,
        article.copyright_stat || 0,
        article.copyright_type || 0,
        article.has_red_packet_cover || 0,
        article.is_pay_subscribe || 0,
        article.item_show_type || 0,
        article.media_duration || '',
        article.mediaapi_publish_status || 0,
        article.pic_cdn_url_1_1 || '',
        article.pic_cdn_url_3_4 || '',
        article.pic_cdn_url_16_9 || '',
        article.pic_cdn_url_235_1 || '',
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
      UPDATE worker_scope_accounts
      SET nickname = ?,
          round_head_img = ?,
          total_count = ?,
          article_count = (
            SELECT COUNT(*) FROM worker_scope_articles WHERE scope_id = ? AND fakeid = ?
          ),
          message_count = (
            SELECT COUNT(*) FROM worker_scope_articles WHERE scope_id = ? AND fakeid = ? AND itemidx = 1
          ),
          last_sync_at = ?,
          last_article_time = (
            SELECT MAX(create_time) FROM worker_scope_articles WHERE scope_id = ? AND fakeid = ?
          ),
          updated_at = ?
      WHERE scope_id = ? AND fakeid = ?
    `,
    [
      account.nickname || null,
      account.round_head_img || null,
      totalCount,
      resolvedScopeId,
      account.fakeid,
      resolvedScopeId,
      account.fakeid,
      now,
      resolvedScopeId,
      account.fakeid,
      now,
      resolvedScopeId,
      account.fakeid,
    ]
  );

  return { inserted, updated };
}

export async function listPendingHtmlArticles(
  limit: number,
  options?: {
    fakeids?: string[] | null;
    createTimeStart?: number | null;
    createTimeEnd?: number | null;
  },
  scopeId?: string | null
): Promise<PendingHtmlArticleRow[]> {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  const normalizedFakeids = options?.fakeids == null ? null : normalizeSelectedAccountFakeids(options.fakeids);
  if (normalizedFakeids?.length === 0) {
    return [];
  }
  const createTimeStart = options?.createTimeStart ?? null;
  const createTimeEnd = options?.createTimeEnd ?? null;
  const fakeidFilter =
    normalizedFakeids && normalizedFakeids.length > 0
      ? ` AND fakeid IN (${normalizedFakeids.map(() => '?').join(', ')})`
      : '';
  const createTimeStartFilter = createTimeStart == null ? '' : ' AND create_time >= ?';
  const createTimeEndFilter = createTimeEnd == null ? '' : ' AND create_time <= ?';
  const params = [...(normalizedFakeids || [])];
  if (createTimeStart != null) {
    params.push(createTimeStart);
  }
  if (createTimeEnd != null) {
    params.push(createTimeEnd);
  }
  params.push(Math.max(1, limit));
  return sqlite.all<PendingHtmlArticleRow>(
    `
      SELECT id, fakeid, aid, title, link
      FROM worker_scope_articles
      WHERE scope_id = ?
        AND is_deleted = 0
        AND html_downloaded = 0
        ${fakeidFilter}
        ${createTimeStartFilter}
        ${createTimeEndFilter}
      ORDER BY update_time DESC, create_time DESC
      LIMIT ?
    `,
    [resolvedScopeId, ...params]
  );
}

export async function markArticleHtmlDownloaded(articleId: string, htmlPath: string, scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  sqlite.run(
    `
      UPDATE worker_scope_articles
      SET html_downloaded = 1,
          html_path = ?,
          html_updated_at = ?,
          updated_at = ?
      WHERE scope_id = ?
        AND id = ?
    `,
    [htmlPath, Date.now(), Date.now(), resolvedScopeId, articleId]
  );
}

export async function markArticleDeleted(articleId: string, scopeId?: string | null) {
  const resolvedScopeId = normalizeWorkerScopeId(scopeId);
  const sqlite = await getSqlite();
  await ensureWorkerScopeReady(sqlite, resolvedScopeId);
  sqlite.run(
    `
      UPDATE worker_scope_articles
      SET is_deleted = 1,
          updated_at = ?
      WHERE scope_id = ?
        AND id = ?
    `,
    [Date.now(), resolvedScopeId, articleId]
  );
}
