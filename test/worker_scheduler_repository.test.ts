import assert from 'node:assert/strict';
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

test('listPendingHtmlArticles returns empty when explicitly passed an empty selection', async () => {
  const rows = await repository.listPendingHtmlArticles(10, { fakeids: [] });
  assert.deepEqual(rows, []);
});

test('filtered account and pending-html queries honor selected fakeids', async () => {
  await repository.upsertTrackedAccounts([
    { fakeid: 'f1', nickname: 'A', round_head_img: '' },
    { fakeid: 'f2', nickname: 'B', round_head_img: '' },
  ] as any);

  await repository.upsertAccountArticles({ fakeid: 'f1', nickname: 'A', round_head_img: '' } as any, 1, [
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
  ] as any);

  await repository.upsertAccountArticles({ fakeid: 'f2', nickname: 'B', round_head_img: '' } as any, 1, [
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
  ] as any);

  const filteredAccounts = await repository.listTrackedAccountsByFakeids(['f2', 'f1', 'f2']);
  assert.deepEqual(
    filteredAccounts.map((account: { fakeid: string }) => account.fakeid),
    ['f2', 'f1']
  );

  const pending = await repository.listPendingHtmlArticles(10, {
    fakeids: ['f1'],
    createTimeStart: 1712611200,
    createTimeEnd: 1712793599,
  });
  assert.equal(pending.length, 1);
  assert.deepEqual(
    pending.map((article: { fakeid: string }) => article.fakeid),
    ['f1']
  );

  await repository.markArticleHtmlDownloaded('f1:a1', 'worker-html/f1/a1.html');
  const afterExport = await repository.listPendingHtmlArticles(10, {
    fakeids: ['f1'],
    createTimeStart: 1712611200,
    createTimeEnd: 1712793599,
  });
  assert.deepEqual(afterExport, []);
});

test('readTrackedArticleHtmlBatch returns stored html content for downloaded worker articles', async () => {
  await repository.upsertTrackedAccounts([{ fakeid: 'f3', nickname: 'C', round_head_img: '' }] as any);
  await repository.upsertAccountArticles({ fakeid: 'f3', nickname: 'C', round_head_img: '' } as any, 1, [
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
  ] as any);

  const relativePath = path.join(path.relative(process.cwd(), htmlDir), 'f3', 'c1.html');
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), relativePath)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), relativePath), '<html>worker html</html>', 'utf8');
  await repository.markArticleHtmlDownloaded('f3:c1', relativePath);

  const htmlList = await repository.readTrackedArticleHtmlBatch('f3', ['c1']);
  assert.equal(htmlList.length, 1);
  assert.equal(htmlList[0].aid, 'c1');
  assert.equal(htmlList[0].html, '<html>worker html</html>');
});
