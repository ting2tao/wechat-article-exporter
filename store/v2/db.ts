import Dexie, { type EntityTable, type Table } from 'dexie';
import { buildScopedDexieName, getStoredScopeId } from '~/utils/auth-scope';
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

export type ScopedDexie = Dexie & {
  api: Table<{ name: string; account: string; call_time: number }, number>;
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

const dbCache = new Map<string, ScopedDexie>();

function createDb(scopeId: string): ScopedDexie {
  const db = new Dexie(buildScopedDexieName(scopeId)) as ScopedDexie;

  db.version(1).stores({
    api: '++, name, account, call_time',
    article: ', fakeid, create_time, link',
    asset: 'url',
    comment: 'url',
    comment_reply: ', url, contentID',
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

  return db;
}

export function getDb(scopeId = getStoredScopeId() || 'anonymous'): ScopedDexie {
  let db = dbCache.get(scopeId);
  if (!db) {
    db = createDb(scopeId);
    dbCache.set(scopeId, db);
  }

  return db;
}
