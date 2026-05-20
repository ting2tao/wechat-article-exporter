import assert from 'node:assert/strict';
import test from 'node:test';
import { extractWechatBizFromUrl, isWechatMpUrl } from '../shared/utils/wechat-url.ts';

test('isWechatMpUrl accepts copied mp profile links', () => {
  assert.equal(
    isWechatMpUrl(
      'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzYzOTU1NTUzNw==&scene=124#wechat_redirect'
    ),
    true
  );
});

test('extractWechatBizFromUrl reads __biz from copied profile links', () => {
  assert.equal(
    extractWechatBizFromUrl(
      'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzYzOTU1NTUzNw==&scene=124#wechat_redirect'
    ),
    'MzYzOTU1NTUzNw=='
  );
});

test('isWechatMpUrl rejects non-wechat urls', () => {
  assert.equal(isWechatMpUrl('https://example.com/mp/profile_ext?__biz=abc'), false);
});
