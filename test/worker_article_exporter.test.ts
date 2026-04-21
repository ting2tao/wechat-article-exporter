import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const outputRoot = path.join(os.tmpdir(), `worker-article-exporter-${process.pid}-${Date.now()}`);
const sampleHtmlPath = new URL('../samples/普通图文/01.html', import.meta.url);
const { exportArticleFormats } = await import(
  new URL('../server/services/worker/article-exporter.ts', import.meta.url).href
);

test.after(async () => {
  await fs.promises.rm(outputRoot, { recursive: true, force: true });
});

test('exportArticleFormats writes only the selected per-article formats', async () => {
  const html = await fs.promises.readFile(sampleHtmlPath, 'utf8');

  const result = await exportArticleFormats({
    scopeId: 'scope-a',
    fakeid: 'f1',
    aid: 'a1',
    title: '示例文章',
    html,
    formats: ['html', 'txt', 'markdown'],
    outputRoot,
  });

  assert.deepEqual(result.writtenFormats, ['html', 'txt', 'markdown']);
  assert.ok(result.files.html);
  assert.ok(result.files.txt);
  assert.ok(result.files.markdown);

  const exportedHtml = await fs.promises.readFile(result.files.html!, 'utf8');
  const exportedTxt = await fs.promises.readFile(result.files.txt!, 'utf8');
  const exportedMarkdown = await fs.promises.readFile(result.files.markdown!, 'utf8');

  assert.match(exportedHtml, /<!DOCTYPE html>/i);
  assert.ok(exportedTxt.trim().length > 0);
  assert.ok(exportedMarkdown.trim().length > 0);
});
