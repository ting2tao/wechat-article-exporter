# Worker Scheduler Format Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the scheduled worker run only for explicitly selected公众号 and explicitly selected per-article export formats (`html`, `txt`, `markdown`), while keeping `word/excel/json` manual-only and preventing the settings form from being overwritten by polling.

**Architecture:** Extend scheduler config to persist two explicit selections: `selectedAccountFakeids` and `selectedExportFormats`. Refactor the current HTML-only worker download path into a filtered scheduled export pipeline that can generate multiple per-article output formats from cached/raw HTML, and keep scheduler decisions in small pure helpers so the risky parts are testable with Node’s built-in runner.

**Tech Stack:** Nuxt 3, Nitro server routes, SQLite via `better-sqlite3`, Vue 3 Composition API, Node 22 built-in test runner, `turndown`.

---

### Task 1: Add explicit scheduler selection types and pure decision helpers

**Files:**
- Create: `server/services/worker/config-helpers.ts`
- Create: `test/worker_scheduler_config_helpers.test.ts`
- Modify: `types/worker-scheduler.ts`

- [ ] **Step 1: Write the failing test for config normalization**

```ts
// test/worker_scheduler_config_helpers.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSelectedAccountFakeids,
  normalizeSelectedExportFormats,
  shouldSkipScheduledExport,
} from '../server/services/worker/config-helpers.ts';

test('normalizeSelectedAccountFakeids removes blanks and duplicates', () => {
  assert.deepEqual(normalizeSelectedAccountFakeids(['', 'f1', 'f1', 'f2']), ['f1', 'f2']);
});

test('normalizeSelectedExportFormats filters unsupported values', () => {
  assert.deepEqual(normalizeSelectedExportFormats(['html', 'excel', 'word', 'markdown', '']), ['html', 'markdown']);
});

test('shouldSkipScheduledExport reports missing accounts before missing formats', () => {
  assert.deepEqual(shouldSkipScheduledExport([], ['html']), {
    shouldSkip: true,
    summary: '未选择公众号，已跳过本轮定时导出',
  });
});

test('shouldSkipScheduledExport reports missing formats', () => {
  assert.deepEqual(shouldSkipScheduledExport(['f1'], []), {
    shouldSkip: true,
    summary: '未选择导出格式，已跳过本轮定时导出',
  });
});

test('shouldSkipScheduledExport allows export when both selections exist', () => {
  assert.deepEqual(shouldSkipScheduledExport(['f1'], ['html']), {
    shouldSkip: false,
    summary: '',
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_config_helpers.test.ts
```

Expected: FAIL because `server/services/worker/config-helpers.ts` does not exist yet.

- [ ] **Step 3: Write the minimal helper implementation and type additions**

```ts
// server/services/worker/config-helpers.ts
export const SCHEDULED_EXPORT_FORMATS = ['html', 'txt', 'markdown'] as const;

export type ScheduledExportFormat = (typeof SCHEDULED_EXPORT_FORMATS)[number];

export function normalizeSelectedAccountFakeids(value: string[] | null | undefined) {
  return [...new Set((value || []).map(item => item.trim()).filter(Boolean))];
}

export function normalizeSelectedExportFormats(value: string[] | null | undefined): ScheduledExportFormat[] {
  const allowed = new Set<string>(SCHEDULED_EXPORT_FORMATS);
  return [...new Set((value || []).map(item => item.trim()).filter(item => allowed.has(item)))].map(
    item => item as ScheduledExportFormat
  );
}

export function shouldSkipScheduledExport(selectedAccountFakeids: string[], selectedExportFormats: ScheduledExportFormat[]) {
  if (selectedAccountFakeids.length === 0) {
    return { shouldSkip: true, summary: '未选择公众号，已跳过本轮定时导出' };
  }
  if (selectedExportFormats.length === 0) {
    return { shouldSkip: true, summary: '未选择导出格式，已跳过本轮定时导出' };
  }
  return { shouldSkip: false, summary: '' };
}
```

```ts
// types/worker-scheduler.ts
export interface WorkerSchedulerConfig {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  downloadEnabled: boolean;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  alertWebhookUrl: string;
  authBound: boolean;
  authBoundAt: number | null;
  selectedAccountFakeids: string[];
  selectedExportFormats: Array<'html' | 'txt' | 'markdown'>;
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_config_helpers.test.ts
```

Expected: PASS with 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add types/worker-scheduler.ts server/services/worker/config-helpers.ts test/worker_scheduler_config_helpers.test.ts
git commit -m "feat: add worker scheduler selection helpers"
```

### Task 2: Persist account and format selections in scheduler config and expose filtered queries

**Files:**
- Modify: `server/services/worker/repository.ts`
- Create: `test/worker_scheduler_repository.test.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
// test/worker_scheduler_repository.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.WORKER_SQLITE_PATH = '.tmp/worker-scheduler-repository-test.db';

const repository = await import('../server/services/worker/repository.ts');

test('scheduler config persists selected accounts and formats', async () => {
  await repository.updateSchedulerConfig({
    selectedAccountFakeids: ['f1', 'f2', 'f1'],
    selectedExportFormats: ['html', 'markdown', 'excel'] as any,
  });

  const config = await repository.getSchedulerConfig();
  assert.deepEqual(config.selectedAccountFakeids, ['f1', 'f2']);
  assert.deepEqual(config.selectedExportFormats, ['html', 'markdown']);
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_repository.test.ts
```

Expected: FAIL because the config shape and DB schema do not yet support the new fields.

- [ ] **Step 3: Extend the schema, mapping, and filtered query helpers**

```ts
// server/services/worker/repository.ts
interface SchedulerConfigRecord {
  syncEnabled: number;
  syncIntervalMinutes: number;
  downloadEnabled: number;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  alertWebhookUrl: string | null;
  authKey: string | null;
  authBoundAt: number | null;
  selectedAccountFakeids: string | null;
  selectedExportFormats: string | null;
}
```

```ts
// inside CREATE TABLE IF NOT EXISTS worker_scheduler_config
selected_account_fakeids TEXT NOT NULL DEFAULT '[]',
selected_export_formats TEXT NOT NULL DEFAULT '[]',
```

```ts
// migration block
if (!configColumns.includes('selected_account_fakeids')) {
  db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN selected_account_fakeids TEXT NOT NULL DEFAULT '[]'`);
}
if (!configColumns.includes('selected_export_formats')) {
  db.exec(`ALTER TABLE worker_scheduler_config ADD COLUMN selected_export_formats TEXT NOT NULL DEFAULT '[]'`);
}
```

```ts
// mapConfig
selectedAccountFakeids: normalizeSelectedAccountFakeids(parseJsonArray(record.selectedAccountFakeids)),
selectedExportFormats: normalizeSelectedExportFormats(parseJsonArray(record.selectedExportFormats)),
```

```ts
// updateSchedulerConfig write path
selectedAccountFakeids: normalizeSelectedAccountFakeids(patch.selectedAccountFakeids ?? parseJsonArray(current?.selected_account_fakeids)),
selectedExportFormats: normalizeSelectedExportFormats(patch.selectedExportFormats ?? parseJsonArray(current?.selected_export_formats)),
```

```ts
// new helper queries in repository.ts
export async function listTrackedAccountsByFakeids(fakeids: string[]) {
  if (fakeids.length === 0) return [];
  const sqlite = await getSqlite();
  const placeholders = fakeids.map(() => '?').join(', ');
  const rows = sqlite.all<WorkerAccountRow>(`SELECT * FROM worker_accounts WHERE fakeid IN (${placeholders})`, fakeids);
  const rowMap = new Map(rows.map(row => [row.fakeid, row]));
  return fakeids.map(fakeid => rowMap.get(fakeid)).filter(Boolean).map(row => ({
    fakeid: row!.fakeid,
    nickname: row!.nickname || undefined,
    round_head_img: row!.round_head_img || undefined,
    completed: false,
    count: row!.message_count,
    articles: row!.article_count,
    total_count: row!.total_count,
    create_time: Math.floor(row!.created_at / 1000),
    update_time: row!.last_sync_at ? Math.floor(row!.last_sync_at / 1000) : undefined,
    last_update_time: row!.last_article_time || undefined,
  }));
}

export async function listPendingHtmlArticles(limit: number, fakeids: string[] = []): Promise<PendingHtmlArticleRow[]> {
  const sqlite = await getSqlite();
  const params: unknown[] = [];
  const fakeidFilter = fakeids.length
    ? ` AND fakeid IN (${fakeids.map(() => '?').join(', ')})`
    : '';
  params.push(...fakeids, Math.max(1, limit));
  return sqlite.all<PendingHtmlArticleRow>(
    `
      SELECT id, fakeid, aid, title, link
      FROM worker_articles
      WHERE is_deleted = 0
        AND html_downloaded = 0
        ${fakeidFilter}
      ORDER BY update_time DESC, create_time DESC
      LIMIT ?
    `,
    params
  );
}
```

- [ ] **Step 4: Run the repository test to verify it passes**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_repository.test.ts
```

Expected: PASS and the temp SQLite file contains the new config columns.

- [ ] **Step 5: Commit**

```bash
git add server/services/worker/repository.ts test/worker_scheduler_repository.test.ts
git commit -m "feat: persist worker scheduler account and format selections"
```

### Task 3: Build a server-side scheduled exporter for per-article formats

**Files:**
- Add dependency: `package.json`, `yarn.lock`
- Create: `server/services/worker/article-exporter.ts`
- Modify: `server/services/worker/html-downloader.ts`
- Create: `test/worker_article_exporter.test.ts`

- [ ] **Step 1: Write the failing exporter test**

```ts
// test/worker_article_exporter.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { exportArticleFormats } from '../server/services/worker/article-exporter.ts';

test('exportArticleFormats only writes selected formats', async () => {
  const result = await exportArticleFormats({
    fakeid: 'f1',
    aid: 'a1',
    title: '示例文章',
    link: 'https://mp.weixin.qq.com/s/test',
    html: '<html><body><article id="js_article"><div id="js_content"><p>Hello</p></div></article></body></html>',
    formats: ['html', 'txt', 'markdown'],
    outputRoot: '.tmp/worker-export-test',
  });

  assert.equal(result.writtenFormats.includes('html'), true);
  assert.equal(result.writtenFormats.includes('txt'), true);
  assert.equal(result.writtenFormats.includes('markdown'), true);
  assert.equal(result.writtenFormats.includes('markdown'), true);
});
```

- [ ] **Step 2: Run the exporter test to verify it fails**

Run:

```bash
node --test --experimental-strip-types test/worker_article_exporter.test.ts
```

Expected: FAIL because `article-exporter.ts` does not exist yet.

- [ ] **Step 3: Add the server exporter**

```ts
// server/services/worker/article-exporter.ts
import TurndownService from 'turndown';
import { parseCgiDataNew } from '#shared/utils/html';
import { renderHTMLFromCgiDataNew, renderTextFromCgiDataNew } from '#shared/utils/renderer';
import type { ScheduledExportFormat } from './config-helpers';

export async function exportArticleFormats(input: {
  fakeid: string;
  aid: string;
  title: string;
  link: string;
  html: string;
  formats: ScheduledExportFormat[];
  outputRoot: string;
}) {
  const writtenFormats: ScheduledExportFormat[] = [];
  const cgiData = await parseCgiDataNew(input.html);
  const renderedHtml = cgiData ? await renderHTMLFromCgiDataNew(cgiData) : input.html;
  const renderedText = cgiData ? renderTextFromCgiDataNew(cgiData) : '';
  const turndownService = new TurndownService();

  // write one file per selected format into <outputRoot>/<fakeid>/<format>/
  // return { writtenFormats }
}
```

```ts
// server/services/worker/html-downloader.ts
export async function downloadPendingHtmlBatch(limit: number, fakeids: string[] = []): Promise<HtmlDownloadSummary> {
  const articles = await listPendingHtmlArticles(limit, fakeids);
  // keep existing HTML download behavior, but use the filtered query
}
```

- [ ] **Step 4: Run dependency install and the exporter test**

Run:

```bash
yarn
node --test --experimental-strip-types test/worker_article_exporter.test.ts
```

Expected: `yarn` updates the lockfile and the test PASSes after the exporter writes only the selected formats.

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock server/services/worker/article-exporter.ts server/services/worker/html-downloader.ts test/worker_article_exporter.test.ts
git commit -m "feat: add scheduled per-article exporter"
```

### Task 4: Wire scheduler flow to selected accounts and selected formats

**Files:**
- Modify: `server/services/worker/scheduler.ts`
- Create: `test/worker_scheduler_policy.test.ts`

- [ ] **Step 1: Write the failing scheduler policy test**

```ts
// test/worker_scheduler_policy.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduledExportSummary } from '../server/services/worker/config-helpers.ts';

test('buildScheduledExportSummary reports selected formats in summary', () => {
  assert.equal(
    buildScheduledExportSummary({ completed: 3, failed: 1, deleted: 0, exported: ['html', 'markdown'] }),
    '已处理 4 篇文章，成功 3 篇，失败 1 篇，已删除 0 篇，导出格式: HTML、Markdown'
  );
});
```

- [ ] **Step 2: Run the scheduler policy test to verify it fails**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_policy.test.ts
```

Expected: FAIL because the summary helper is not implemented yet.

- [ ] **Step 3: Update scheduler to use the new config and exporter**

```ts
// server/services/worker/scheduler.ts
async function runSyncTaskInternal() {
  const authKey = await getSchedulerAuthKey();
  if (!authKey) {
    throw new Error('后台任务还没有绑定登录态，请登录后在设置页保存任务配置');
  }

  const config = await getSchedulerConfig();
  const accounts = await listTrackedAccountsByFakeids(config.selectedAccountFakeids);
  if (accounts.length === 0) {
    const summary = '未选择公众号，已跳过本轮同步';
    await updateSchedulerState({
      lastSyncFinishedAt: Date.now(),
      lastSyncSummary: summary,
      lastSyncError: '',
    });
    return summary;
  }

  // keep the existing loop for selected accounts only
}

async function runDownloadTaskInternal() {
  const config = await getSchedulerConfig();
  const decision = shouldSkipScheduledExport(config.selectedAccountFakeids, config.selectedExportFormats);
  if (decision.shouldSkip) {
    await updateSchedulerState({
      lastDownloadFinishedAt: Date.now(),
      lastDownloadSummary: decision.summary,
      lastDownloadError: '',
    });
    return decision.summary;
  }

  const summary = await runScheduledExportBatch({
    fakeids: config.selectedAccountFakeids,
    formats: config.selectedExportFormats,
    limit: config.downloadBatchSize,
  });

  const summaryText = buildScheduledExportSummary(summary);
  await updateSchedulerState({
    lastDownloadFinishedAt: Date.now(),
    lastDownloadSummary: summaryText,
    lastDownloadError: '',
  });
  return summaryText;
}
```

- [ ] **Step 4: Run the scheduler policy test to verify it passes**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_policy.test.ts
```

Expected: PASS and scheduler summary strings are generated from a pure helper.

- [ ] **Step 5: Commit**

```bash
git add server/services/worker/scheduler.ts test/worker_scheduler_policy.test.ts server/services/worker/config-helpers.ts
git commit -m "feat: wire scheduler to selected accounts and formats"
```

### Task 5: Update the settings UI to edit selections and protect dirty form state

**Files:**
- Modify: `apis/worker.ts`
- Modify: `components/setting/Schedule.vue`
- Create: `test/schedule_form_state.test.ts`

- [ ] **Step 1: Write the failing dirty-state test**

```ts
// test/schedule_form_state.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSchedulerSnapshotIntoForm } from '../server/services/worker/config-helpers.ts';

test('mergeSchedulerSnapshotIntoForm keeps local edits when form is dirty', () => {
  const currentForm = {
    syncEnabled: true,
    syncIntervalMinutes: 10,
    downloadEnabled: true,
    downloadIntervalMinutes: 20,
    downloadBatchSize: 50,
    alertWebhookUrl: 'https://example.com/hook',
    selectedAccountFakeids: ['local-f1'],
    selectedExportFormats: ['html'],
  };

  const snapshot = {
    config: {
      ...currentForm,
      syncEnabled: false,
      selectedAccountFakeids: ['remote-f2'],
      selectedExportFormats: ['markdown'],
    },
    state: {},
    stats: {},
  } as any;

  assert.equal(
    mergeSchedulerSnapshotIntoForm(currentForm, snapshot, true).selectedAccountFakeids[0],
    'local-f1'
  );
});
```

- [ ] **Step 2: Run the form-state test to verify it fails**

Run:

```bash
node --test --experimental-strip-types test/schedule_form_state.test.ts
```

Expected: FAIL because the merge helper does not exist yet.

- [ ] **Step 3: Update the API payload and settings component**

```ts
// apis/worker.ts
export async function saveWorkerSchedulerConfig(payload: {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  downloadEnabled: boolean;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  alertWebhookUrl: string;
  selectedAccountFakeids: string[];
  selectedExportFormats: Array<'html' | 'txt' | 'markdown'>;
}) {
  return request<WorkerSchedulerSnapshot>('/api/web/worker/scheduler', {
    method: 'POST',
    body: payload,
  });
}
```

```ts
// components/setting/Schedule.vue
const form = reactive({
  syncEnabled: false,
  syncIntervalMinutes: 60,
  downloadEnabled: false,
  downloadIntervalMinutes: 60,
  downloadBatchSize: 50,
  alertWebhookUrl: '',
  selectedAccountFakeids: [] as string[],
  selectedExportFormats: [] as Array<'html' | 'txt' | 'markdown'>,
});

const isDirty = ref(false);

watch(
  () => ({
    syncEnabled: form.syncEnabled,
    syncIntervalMinutes: form.syncIntervalMinutes,
    downloadEnabled: form.downloadEnabled,
    downloadIntervalMinutes: form.downloadIntervalMinutes,
    downloadBatchSize: form.downloadBatchSize,
    alertWebhookUrl: form.alertWebhookUrl,
    selectedAccountFakeids: [...form.selectedAccountFakeids],
    selectedExportFormats: [...form.selectedExportFormats],
  }),
  () => {
    isDirty.value = true;
  },
  { deep: true }
);

function applySnapshot(value: WorkerSchedulerSnapshot, force = false) {
  snapshot.value = value;
  if (isDirty.value && !force) return;
  form.selectedAccountFakeids = [...value.config.selectedAccountFakeids];
  form.selectedExportFormats = [...value.config.selectedExportFormats];
  // assign the rest of config fields here as well
}
```

- [ ] **Step 4: Run the form-state test to verify it passes**

Run:

```bash
node --test --experimental-strip-types test/schedule_form_state.test.ts
```

Expected: PASS and manual browser verification shows polling no longer resets unsaved selections.

- [ ] **Step 5: Commit**

```bash
git add apis/worker.ts components/setting/Schedule.vue test/schedule_form_state.test.ts server/services/worker/config-helpers.ts
git commit -m "feat: add scheduler account and format controls"
```

### Task 6: Final verification and docs cleanup

**Files:**
- Review only: `docs/superpowers/specs/2026-04-14-worker-scheduler-account-selection-design.md`
- Review only: `docs/superpowers/plans/2026-04-14-worker-scheduler-format-selection.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test --experimental-strip-types test/worker_scheduler_config_helpers.test.ts
node --test --experimental-strip-types test/worker_scheduler_repository.test.ts
node --test --experimental-strip-types test/worker_article_exporter.test.ts
node --test --experimental-strip-types test/worker_scheduler_policy.test.ts
node --test --experimental-strip-types test/schedule_form_state.test.ts
```

Expected: PASS across all five targeted tests.

- [ ] **Step 2: Run formatting**

Run:

```bash
yarn format
```

Expected: Biome rewrites touched files with no remaining formatting errors.

- [ ] **Step 3: Manual verification in dev server**

Run:

```bash
yarn dev
```

Expected manual checks:

- Settings page shows explicit公众号多选 and format multi-select.
- Leaving the form unsaved for >15 seconds does not revert local selections.
- Saving with no公众号 or no格式 does not auto-disable toggles.
- Triggering “立即同步” only touches selected公众号.
- Triggering “立即抓取/导出” only writes selected formats for selected公众号.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: support scheduled export account and format selection"
```

## Self-Review

- Spec coverage:
  - Explicit公众号选择: Task 1, 2, 4, 5
  - Explicit逐篇格式选择: Task 1, 2, 3, 4, 5
  - `excel/json` remains manual-only: Task 1 types + Task 5 UI copy
  - Dirty-form polling protection: Task 5
  - Skip summaries instead of auto-disable: Task 1 + Task 4
- Placeholder scan:
  - No `TODO` / `TBD`
  - Every code-changing step includes concrete snippets
  - Every verification step has an exact command
- Type consistency:
  - `selectedExportFormats` uses the same union everywhere: `'html' | 'txt' | 'markdown'`
  - Scheduler summaries are centralized through helpers to avoid string drift
