import assert from 'node:assert/strict';
import test from 'node:test';

const merge = await import(new URL('../shared/utils/account-sync.ts', import.meta.url).href);

test('mergeAccountLists prefers newer worker account stats over stale local cache', () => {
  const merged = merge.mergeAccountLists(
    [
      {
        fakeid: 'f1',
        nickname: 'Old',
        round_head_img: 'a.png',
        completed: false,
        count: 80,
        articles: 80,
        total_count: 1721,
        create_time: 1,
        update_time: 100,
        last_update_time: 90,
      },
    ],
    [
      {
        fakeid: 'f1',
        nickname: 'New',
        round_head_img: 'b.png',
        completed: false,
        count: 1120,
        articles: 1120,
        total_count: 1751,
        create_time: 1,
        update_time: 200,
        last_update_time: 190,
      },
    ]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].nickname, 'New');
  assert.equal(merged[0].round_head_img, 'b.png');
  assert.equal(merged[0].count, 1120);
  assert.equal(merged[0].articles, 1120);
  assert.equal(merged[0].total_count, 1751);
  assert.equal(merged[0].update_time, 200);
});

test('mergeAccountLists keeps newer local cache when worker snapshot is older', () => {
  const merged = merge.mergeAccountLists(
    [
      {
        fakeid: 'f1',
        nickname: 'Local',
        round_head_img: 'local.png',
        completed: true,
        count: 300,
        articles: 280,
        total_count: 500,
        create_time: 1,
        update_time: 300,
        last_update_time: 290,
      },
    ],
    [
      {
        fakeid: 'f1',
        nickname: 'Worker',
        round_head_img: 'worker.png',
        completed: false,
        count: 200,
        articles: 180,
        total_count: 450,
        create_time: 1,
        update_time: 200,
        last_update_time: 190,
      },
    ]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].nickname, 'Local');
  assert.equal(merged[0].count, 300);
  assert.equal(merged[0].articles, 280);
  assert.equal(merged[0].total_count, 500);
  assert.equal(merged[0].update_time, 300);
});

test('mergeAccountLists includes worker-only accounts so background-synced rows are visible', () => {
  const merged = merge.mergeAccountLists([], [
    {
      fakeid: 'f2',
      nickname: 'WorkerOnly',
      round_head_img: 'worker-only.png',
      completed: false,
      count: 30,
      articles: 30,
      total_count: 100,
      create_time: 2,
      update_time: 210,
      last_update_time: 205,
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].fakeid, 'f2');
  assert.equal(merged[0].nickname, 'WorkerOnly');
});
