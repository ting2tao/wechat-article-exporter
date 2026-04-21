import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const dbPath = path.join(os.tmpdir(), `worker-scheduler-repository-${process.pid}-${Date.now()}.db`);
const htmlDir = path.join(os.tmpdir(), `worker-scheduler-html-${process.pid}-${Date.now()}`);
const originalDbPath = process.env.WORKER_SQLITE_PATH;
const originalHtmlDir = process.env.WORKER_HTML_DIR;

for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(`${dbPath}${suffix}`, { force: true });
}
process.env.WORKER_SQLITE_PATH = dbPath;
process.env.WORKER_HTML_DIR = htmlDir;

const repository = await import(new URL('../server/services/worker/repository.ts', import.meta.url).href);

test.after(() => {
  if (originalDbPath === undefined) {
    delete process.env.WORKER_SQLITE_PATH;
  } else {
    process.env.WORKER_SQLITE_PATH = originalDbPath;
  }
  if (originalHtmlDir === undefined) {
    delete process.env.WORKER_HTML_DIR;
  } else {
    process.env.WORKER_HTML_DIR = originalHtmlDir;
  }

  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
  fs.rmSync(htmlDir, { recursive: true, force: true });
});

test('scheduler config persists selected accounts and formats per scope', async () => {
  await repository.updateSchedulerConfig(
    {
      selectedAccountFakeids: ['f1', 'f2', 'f1'],
      selectedExportFormats: ['html', 'markdown', 'excel'] as any,
      downloadDateRangeType: 'recentDays',
      downloadRecentDays: 3,
      downloadDateStart: '2026-04-01',
      downloadDateEnd: '2026-04-03',
    },
    'scope-a'
  );

  await repository.updateSchedulerConfig(
    {
      selectedAccountFakeids: ['g1'],
      selectedExportFormats: ['txt'] as any,
      downloadDateRangeType: 'all',
      downloadRecentDays: 7,
      downloadDateStart: '',
      downloadDateEnd: '',
    },
    'scope-b'
  );

  const config = await repository.getSchedulerConfig('scope-a');
  assert.deepEqual(config.selectedAccountFakeids, ['f1', 'f2']);
  assert.deepEqual(config.selectedExportFormats, ['html', 'markdown']);
  assert.equal(config.downloadDateRangeType, 'recentDays');
  assert.equal(config.downloadRecentDays, 3);
  assert.equal(config.downloadDateStart, '2026-04-01');
  assert.equal(config.downloadDateEnd, '2026-04-03');

  const otherConfig = await repository.getSchedulerConfig('scope-b');
  assert.deepEqual(otherConfig.selectedAccountFakeids, ['g1']);
  assert.deepEqual(otherConfig.selectedExportFormats, ['txt']);
  assert.equal(otherConfig.downloadDateRangeType, 'all');
});

test('listPendingHtmlArticles returns empty when explicitly passed an empty selection', async () => {
  const rows = await repository.listPendingHtmlArticles(10, {
    fakeids: [],
  });
  assert.deepEqual(rows, []);
});

test('worker accounts and articles stay isolated by scope', async () => {
  await repository.upsertTrackedAccounts(
    [
      { fakeid: 'f1', nickname: 'Scope A', round_head_img: '' },
      { fakeid: 'shared', nickname: 'Shared A', round_head_img: '' },
    ] as any,
    'scope-a'
  );

  await repository.upsertTrackedAccounts(
    [
      { fakeid: 'f2', nickname: 'Scope B', round_head_img: '' },
      { fakeid: 'shared', nickname: 'Shared B', round_head_img: '' },
    ] as any,
    'scope-b'
  );

  await repository.upsertAccountArticles(
    { fakeid: 'shared', nickname: 'Shared A', round_head_img: '' } as any,
    1,
    [
      {
        aid: 'a1',
        title: 'Scope A Article',
        link: 'https://example.com/shared-a1',
        cover: '',
        digest: '',
        create_time: 1712707200,
        update_time: 2000,
        itemidx: 1,
        is_deleted: 0,
      },
    ] as any,
    'scope-a'
  );

  await repository.upsertAccountArticles(
    { fakeid: 'shared', nickname: 'Shared B', round_head_img: '' } as any,
    1,
    [
      {
        aid: 'a1',
        title: 'Scope B Article',
        link: 'https://example.com/shared-a1-b',
        cover: '',
        digest: '',
        create_time: 1712966400,
        update_time: 3000,
        itemidx: 1,
        is_deleted: 0,
      },
    ] as any,
    'scope-b'
  );

  const scopeAAccounts = await repository.listTrackedAccounts('scope-a');
  assert.deepEqual(
    scopeAAccounts
      .map((account: { fakeid: string; nickname?: string }) => [account.fakeid, account.nickname])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    [
      ['f1', 'Scope A'],
      ['shared', 'Shared A'],
    ]
  );

  const scopeBAccounts = await repository.listTrackedAccounts('scope-b');
  assert.deepEqual(
    scopeBAccounts
      .map((account: { fakeid: string; nickname?: string }) => [account.fakeid, account.nickname])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    [
      ['f2', 'Scope B'],
      ['shared', 'Shared B'],
    ]
  );

  const scopeAArticles = await repository.listTrackedArticlesByFakeid('shared', 'scope-a');
  assert.equal(scopeAArticles.length, 1);
  assert.equal(scopeAArticles[0].title, 'Scope A Article');

  const scopeBArticles = await repository.listTrackedArticlesByFakeid('shared', 'scope-b');
  assert.equal(scopeBArticles.length, 1);
  assert.equal(scopeBArticles[0].title, 'Scope B Article');
});

test('filtered account and pending-html queries honor selected fakeids within a scope', async () => {
  await repository.upsertTrackedAccounts(
    [
      { fakeid: 'f1', nickname: 'A', round_head_img: '' },
      { fakeid: 'f2', nickname: 'B', round_head_img: '' },
    ] as any,
    'scope-filter'
  );

  await repository.upsertAccountArticles(
    { fakeid: 'f1', nickname: 'A', round_head_img: '' } as any,
    1,
    [
      {
        aid: 'a1',
        title: 'Article A',
        link: 'https://example.com/a1',
        cover: '',
        digest: '',
        create_time: 1712707200,
        update_time: 2000,
        itemidx: 1,
        is_deleted: 0,
      },
    ] as any,
    'scope-filter'
  );

  await repository.upsertAccountArticles(
    { fakeid: 'f2', nickname: 'B', round_head_img: '' } as any,
    1,
    [
      {
        aid: 'b1',
        title: 'Article B',
        link: 'https://example.com/b1',
        cover: '',
        digest: '',
        create_time: 1712966400,
        update_time: 3000,
        itemidx: 1,
        is_deleted: 0,
      },
    ] as any,
    'scope-filter'
  );

  const filteredAccounts = await repository.listTrackedAccountsByFakeids(['f2', 'f1', 'f2'], 'scope-filter');
  assert.deepEqual(
    filteredAccounts.map((account: { fakeid: string }) => account.fakeid),
    ['f2', 'f1']
  );

  const pending = await repository.listPendingHtmlArticles(
    10,
    {
      fakeids: ['f1'],
      createTimeStart: 1712611200,
      createTimeEnd: 1712793599,
    },
    'scope-filter'
  );
  assert.equal(pending.length, 1);
  assert.deepEqual(
    pending.map((article: { fakeid: string }) => article.fakeid),
    ['f1']
  );

  await repository.markArticleHtmlDownloaded('f1:a1', 'worker-html/f1/a1.html', 'scope-filter');
  const afterExport = await repository.listPendingHtmlArticles(
    10,
    {
      fakeids: ['f1'],
      createTimeStart: 1712611200,
      createTimeEnd: 1712793599,
    },
    'scope-filter'
  );
  assert.deepEqual(afterExport, []);
});

test('readTrackedArticleHtmlBatch returns stored html content for downloaded worker articles within a scope', async () => {
  await repository.upsertTrackedAccounts([{ fakeid: 'f3', nickname: 'C', round_head_img: '' }] as any, 'scope-html');
  await repository.upsertAccountArticles(
    { fakeid: 'f3', nickname: 'C', round_head_img: '' } as any,
    1,
    [
      {
        aid: 'c1',
        title: 'Article C',
        link: 'https://example.com/c1',
        cover: '',
        digest: '',
        create_time: 1712966400,
        update_time: 4000,
        itemidx: 1,
        is_deleted: 0,
      },
    ] as any,
    'scope-html'
  );

  const relativePath = path.join(path.relative(process.cwd(), htmlDir), 'scope-html', 'f3', 'c1.html');
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), relativePath)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), relativePath), '<html>worker html</html>', 'utf8');
  await repository.markArticleHtmlDownloaded('f3:c1', relativePath, 'scope-html');

  const htmlList = await repository.readTrackedArticleHtmlBatch('f3', ['c1'], 'scope-html');
  assert.equal(htmlList.length, 1);
  assert.equal(htmlList[0].aid, 'c1');
  assert.equal(htmlList[0].html, '<html>worker html</html>');
});

test('scheduler config persists selected accounts and formats', async () => {
  await repository.updateSchedulerConfig({
    selectedAccountFakeids: ['f1', 'f2', 'f1'],
    selectedExportFormats: ['html', 'markdown', 'excel'] as any,
    downloadDateRangeType: 'recentDays',
    downloadRecentDays: 3,
    downloadDateStart: '2026-04-01',
    downloadDateEnd: '2026-04-03',
  });

  const config = await repository.getSchedulerConfig();
  assert.deepEqual(config.selectedAccountFakeids, ['f1', 'f2']);
  assert.deepEqual(config.selectedExportFormats, ['html', 'markdown']);
  assert.equal(config.downloadDateRangeType, 'recentDays');
  assert.equal(config.downloadRecentDays, 3);
  assert.equal(config.downloadDateStart, '2026-04-01');
  assert.equal(config.downloadDateEnd, '2026-04-03');
});

test('legacy global worker data is migrated into the first scoped view', async () => {
  const legacyDb = new Database(dbPath);
  const now = Date.now();

  legacyDb.exec(`
    DELETE FROM worker_articles;
    DELETE FROM worker_accounts;
    DELETE FROM worker_scheduler_state;
    DELETE FROM worker_scheduler_config;
  `);

  legacyDb
    .prepare(
      `
        INSERT INTO worker_scheduler_config (
          id, sync_enabled, sync_interval_minutes, download_enabled, download_interval_minutes,
          download_batch_size, download_date_range_type, download_recent_days, download_date_start, download_date_end,
          alert_webhook_url, auth_key, auth_bound_at, selected_account_fakeids, selected_export_formats, created_at, updated_at
        ) VALUES (1, 1, 30, 1, 45, 20, 'recentDays', 5, '2026-04-01', '2026-04-05', 'https://example.com/hook', ?, ?, '["legacy-fakeid"]', '["html"]', ?, ?)
      `
    )
    .run('legacy-scope', now, now, now);

  legacyDb
    .prepare(
      `
        INSERT INTO worker_scheduler_state (
          id, sync_running, download_running, last_sync_started_at, last_sync_finished_at,
          last_sync_summary, last_sync_error, next_sync_at, last_download_started_at,
          last_download_finished_at, last_download_summary, last_download_error, next_download_at, updated_at
        ) VALUES (1, 0, 0, NULL, ?, 'legacy sync summary', '', ?, NULL, ?, 'legacy download summary', '', ?, ?)
      `
    )
    .run(now - 5_000, now + 30_000, now - 3_000, now + 60_000, now);

  legacyDb
    .prepare(
      `
        INSERT INTO worker_accounts (
          fakeid, nickname, round_head_img, total_count, article_count, message_count, last_sync_at, last_article_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run('legacy-fakeid', 'Legacy Account', '', 12, 3, 2, now - 2_000, 1712966400, now - 10_000, now - 2_000);

  legacyDb
    .prepare(
      `
        INSERT INTO worker_articles (
          id, fakeid, aid, title, link, cover, digest, create_time, update_time, itemidx,
          is_deleted, status, html_downloaded, html_path, html_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '', '', ?, ?, 1, 0, '', 0, NULL, NULL, ?, ?)
      `
    )
    .run(
      'legacy-fakeid:legacy-a1',
      'legacy-fakeid',
      'legacy-a1',
      'Legacy Article',
      'https://example.com/legacy-a1',
      1712966400,
      1713052800,
      now - 10_000,
      now - 2_000
    );
  legacyDb.close();

  const migratedConfig = await repository.getSchedulerConfig('legacy-scope');
  assert.equal(migratedConfig.syncEnabled, true);
  assert.deepEqual(migratedConfig.selectedAccountFakeids, ['legacy-fakeid']);

  const migratedAccounts = await repository.listTrackedAccounts('legacy-scope');
  assert.equal(migratedAccounts.length, 1);
  assert.equal(migratedAccounts[0].fakeid, 'legacy-fakeid');

  const migratedArticles = await repository.listTrackedArticlesByFakeid('legacy-fakeid', 'legacy-scope');
  assert.equal(migratedArticles.length, 1);
  assert.equal(migratedArticles[0].title, 'Legacy Article');
});
