import Dexie, { type EntityTable, type Table } from 'dexie';
import type { ArticleAsset } from './article';
import type { Asset } from './assets';
import type { DebugAsset } from './debug';
import type { HtmlAsset } from './html';
import type { MpAccount } from './info';
import type { ResourceAsset } from './resource';
import type { ResourceMapAsset } from './resource-map';

type CommentAssetRecord = {
  fakeid: string;
  url: string;
  title: string;
  data: unknown;
};

type CommentReplyAssetRecord = CommentAssetRecord & {
  contentID: string;
};

type MetadataRecord = {
  fakeid: string;
  url: string;
  title: string;
  readNum: number;
  oldLikeNum: number;
  shareNum: number;
  likeNum: number;
  commentNum: number;
};

const db = new Dexie('exporter.wxdown.online') as Dexie & {
  article: Table<ArticleAsset, string>;
  asset: EntityTable<Asset, 'url'>;
  comment: EntityTable<CommentAssetRecord, 'url'>;
  comment_reply: Table<CommentReplyAssetRecord, string>;
  debug: EntityTable<DebugAsset, 'url'>;
  html: EntityTable<HtmlAsset, 'url'>;
  info: EntityTable<MpAccount, 'fakeid'>;
  metadata: EntityTable<MetadataRecord, 'url'>;
  resource: EntityTable<ResourceAsset, 'url'>;
  'resource-map': EntityTable<ResourceMapAsset, 'url'>;
};

db.version(1).stores({
  api: '++, name, account, call_time',
  article: ', fakeid, create_time, link', // 主键 fakeid:aid
  asset: 'url',
  comment: 'url',
  comment_reply: ', url, contentID', // 主键 url:contentID
  debug: 'url',
  html: 'url',
  info: 'fakeid',
  metadata: 'url',
  resource: 'url',
  'resource-map': 'url',
});

db.version(2).stores({
  asset: 'url, fakeid',
  comment: 'url, fakeid',
  comment_reply: ', url, contentID, fakeid',
  html: 'url, fakeid',
  metadata: 'url, fakeid',
  resource: 'url, fakeid',
  'resource-map': 'url, fakeid',
});

db.version(3).stores({
  debug: 'url, fakeid',
});

export { db };
