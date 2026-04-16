import assert from 'node:assert/strict';
import test from 'node:test';

const merge = await import(new URL('../shared/utils/article-sync.ts', import.meta.url).href);

test('mergeTrackedArticles prefers newer worker article fields', () => {
  const merged = merge.mergeTrackedArticles(
    [
      {
        fakeid: 'f1',
        aid: 'a1',
        link: 'https://example.com/a1',
        title: 'old',
        cover: '',
        digest: 'old',
        create_time: 100,
        update_time: 100,
        itemidx: 1,
        is_deleted: false,
        author_name: '',
        appmsg_album_infos: [],
        album_id: '',
        appmsgid: 1,
        ban_flag: 0,
        checking: 0,
        copyright_stat: 0,
        copyright_type: 0,
        has_red_packet_cover: 0,
        is_pay_subscribe: 0,
        item_show_type: 0,
        media_duration: '',
        mediaapi_publish_status: 0,
        pic_cdn_url_1_1: '',
        pic_cdn_url_3_4: '',
        pic_cdn_url_16_9: '',
        pic_cdn_url_235_1: '',
        _status: '',
      },
    ],
    [
      {
        fakeid: 'f1',
        aid: 'a1',
        link: 'https://example.com/a1',
        title: 'new',
        cover: '',
        digest: 'new',
        create_time: 100,
        update_time: 200,
        itemidx: 1,
        is_deleted: false,
        author_name: '',
        appmsg_album_infos: [],
        album_id: '',
        appmsgid: 1,
        ban_flag: 0,
        checking: 0,
        copyright_stat: 0,
        copyright_type: 0,
        has_red_packet_cover: 0,
        is_pay_subscribe: 0,
        item_show_type: 0,
        media_duration: '',
        mediaapi_publish_status: 0,
        pic_cdn_url_1_1: '',
        pic_cdn_url_3_4: '',
        pic_cdn_url_16_9: '',
        pic_cdn_url_235_1: '',
        _status: '',
      },
    ]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, 'new');
  assert.equal(merged[0].digest, 'new');
  assert.equal(merged[0].update_time, 200);
});

test('mergeTrackedArticles preserves local status and single-article marker when worker has no stronger value', () => {
  const merged = merge.mergeTrackedArticles(
    [
      {
        fakeid: 'f1',
        aid: 'a1',
        link: 'https://example.com/a1',
        title: 'old',
        cover: '',
        digest: '',
        create_time: 100,
        update_time: 200,
        itemidx: 1,
        is_deleted: false,
        author_name: '',
        appmsg_album_infos: [],
        album_id: '',
        appmsgid: 1,
        ban_flag: 0,
        checking: 0,
        copyright_stat: 0,
        copyright_type: 0,
        has_red_packet_cover: 0,
        is_pay_subscribe: 0,
        item_show_type: 0,
        media_duration: '',
        mediaapi_publish_status: 0,
        pic_cdn_url_1_1: '',
        pic_cdn_url_3_4: '',
        pic_cdn_url_16_9: '',
        pic_cdn_url_235_1: '',
        _status: '正常',
        _single: true,
      },
    ],
    [
      {
        fakeid: 'f1',
        aid: 'a1',
        link: 'https://example.com/a1',
        title: 'worker',
        cover: '',
        digest: '',
        create_time: 100,
        update_time: 100,
        itemidx: 1,
        is_deleted: false,
        author_name: '',
        appmsg_album_infos: [],
        album_id: '',
        appmsgid: 1,
        ban_flag: 0,
        checking: 0,
        copyright_stat: 0,
        copyright_type: 0,
        has_red_packet_cover: 0,
        is_pay_subscribe: 0,
        item_show_type: 0,
        media_duration: '',
        mediaapi_publish_status: 0,
        pic_cdn_url_1_1: '',
        pic_cdn_url_3_4: '',
        pic_cdn_url_16_9: '',
        pic_cdn_url_235_1: '',
        _status: '',
      },
    ]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]._status, '正常');
  assert.equal(merged[0]._single, true);
  assert.equal(merged[0].title, 'old');
});

test('mergeTrackedArticles includes worker-only articles', () => {
  const merged = merge.mergeTrackedArticles([], [
    {
      fakeid: 'f2',
      aid: 'a2',
      link: 'https://example.com/a2',
      title: 'worker',
      cover: '',
      digest: '',
      create_time: 100,
      update_time: 100,
      itemidx: 1,
      is_deleted: false,
      author_name: '',
      appmsg_album_infos: [],
      album_id: '',
      appmsgid: 1,
      ban_flag: 0,
      checking: 0,
      copyright_stat: 0,
      copyright_type: 0,
      has_red_packet_cover: 0,
      is_pay_subscribe: 0,
      item_show_type: 0,
      media_duration: '',
      mediaapi_publish_status: 0,
      pic_cdn_url_1_1: '',
      pic_cdn_url_3_4: '',
      pic_cdn_url_16_9: '',
      pic_cdn_url_235_1: '',
      _status: '',
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].aid, 'a2');
});
