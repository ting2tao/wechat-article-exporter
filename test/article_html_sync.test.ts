import assert from 'node:assert/strict';
import test from 'node:test';

const sync = await import(new URL('../shared/utils/article-html-sync.ts', import.meta.url).href);

test('pickWorkerHtmlBackfillTargets only returns worker-downloaded articles missing from Dexie', () => {
  const targets = sync.pickWorkerHtmlBackfillTargets(
    [
      {
        fakeid: 'f1',
        aid: 'a1',
        link: 'https://example.com/a1',
        title: 'cached',
        html_downloaded: true,
      },
      {
        fakeid: 'f1',
        aid: 'a2',
        link: 'https://example.com/a2',
        title: 'need-backfill',
        html_downloaded: true,
      },
      {
        fakeid: 'f1',
        aid: 'a3',
        link: 'https://example.com/a3',
        title: 'not-downloaded',
        html_downloaded: false,
      },
      {
        fakeid: 'f1',
        aid: 'a4',
        link: 'https://example.com/a4',
        title: 'deleted',
        html_downloaded: true,
        is_deleted: true,
      },
    ],
    ['https://example.com/a1']
  );

  assert.deepEqual(targets, [
    {
      fakeid: 'f1',
      aid: 'a2',
      link: 'https://example.com/a2',
      title: 'need-backfill',
    },
  ]);
});

test('pickWorkerHtmlBackfillTargets deduplicates repeated articles by fakeid and aid', () => {
  const targets = sync.pickWorkerHtmlBackfillTargets(
    [
      {
        fakeid: 'f1',
        aid: 'a2',
        link: 'https://example.com/a2',
        title: 'first',
        html_downloaded: true,
      },
      {
        fakeid: 'f1',
        aid: 'a2',
        link: 'https://example.com/a2?duplicate',
        title: 'duplicate',
        html_downloaded: true,
      },
    ],
    []
  );

  assert.equal(targets.length, 1);
  assert.equal(targets[0].aid, 'a2');
  assert.equal(targets[0].title, 'first');
});
