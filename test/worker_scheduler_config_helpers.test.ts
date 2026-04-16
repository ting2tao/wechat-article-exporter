import assert from 'node:assert/strict';
import test from 'node:test';

const helpers = await import(new URL('../server/services/worker/config-helpers.ts', import.meta.url).href);

const {
  buildScheduledExportSummary,
  formatScheduledExportFormats,
  normalizeScheduledExportDate,
  normalizeScheduledExportDateRangeType,
  normalizeScheduledExportRecentDays,
  normalizeSelectedAccountFakeids,
  normalizeSelectedExportFormats,
  parseStoredStringArray,
  resolveScheduledExportDateRange,
  shouldSkipScheduledExport,
  validateSchedulerConfigSelection,
} = helpers;

test('normalizeSelectedAccountFakeids removes blanks and duplicates', () => {
  assert.deepEqual(normalizeSelectedAccountFakeids(['', 'f1', 'f1', 'f2']), ['f1', 'f2']);
});

test('normalizeSelectedExportFormats filters unsupported values', () => {
  assert.deepEqual(normalizeSelectedExportFormats(['html', 'excel', 'word', 'markdown', '']), ['html', 'markdown']);
});

test('parseStoredStringArray falls back to empty array for invalid JSON', () => {
  assert.deepEqual(parseStoredStringArray('not-json'), []);
});

test('scheduled export date controls are normalized', () => {
  assert.equal(normalizeScheduledExportDateRangeType('recentDays'), 'recentDays');
  assert.equal(normalizeScheduledExportDateRangeType('unexpected'), 'all');
  assert.equal(normalizeScheduledExportRecentDays(0), 3);
  assert.equal(normalizeScheduledExportDate('2026-02-30'), '');
  assert.equal(normalizeScheduledExportDate('2026-02-28'), '2026-02-28');
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

test('formatScheduledExportFormats renders display labels in order', () => {
  assert.equal(formatScheduledExportFormats(['html', 'markdown']), 'HTML、Markdown');
});

test('buildScheduledExportSummary includes counts and selected formats', () => {
  assert.equal(
    buildScheduledExportSummary({
      completed: 3,
      failed: 1,
      deleted: 0,
      exportedFormats: ['html', 'markdown'],
    }),
    '已处理 4 篇文章，成功 3 篇，失败 1 篇，已删除 0 篇，导出格式: HTML、Markdown'
  );
});

test('resolveScheduledExportDateRange produces custom start/end timestamps', () => {
  const range = resolveScheduledExportDateRange({
    downloadDateRangeType: 'customRange',
    downloadRecentDays: 3,
    downloadDateStart: '2026-04-10',
    downloadDateEnd: '2026-04-12',
  });

  assert.equal(range.startTime !== null, true);
  assert.equal(range.endTime !== null, true);
  assert.equal(range.startTime! < range.endTime!, true);
});

test('validateSchedulerConfigSelection blocks invalid enabled states', () => {
  assert.equal(
    validateSchedulerConfigSelection({
      syncEnabled: false,
      downloadEnabled: true,
      selectedAccountFakeids: ['f1'],
      selectedExportFormats: ['html'],
      downloadDateRangeType: 'customRange',
      downloadRecentDays: 3,
      downloadDateStart: '',
      downloadDateEnd: '',
    }),
    '自定义时间范围至少需要填写开始日期或结束日期'
  );
});
