import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAccountNameFromHtml } from '../server/utils/wechat-account-page.ts';

test('extractAccountNameFromHtml reads profile page nickname', () => {
  const html = `
    <html>
      <head><title>公众号主页</title></head>
      <body>
        <strong class="profile_nickname">  测试公众号  </strong>
      </body>
    </html>
  `;

  assert.equal(extractAccountNameFromHtml(html), '测试公众号');
});

test('extractAccountNameFromHtml falls back to og:title', () => {
  const html = '<html><head><meta property="og:title" content="备用公众号"></head><body></body></html>';

  assert.equal(extractAccountNameFromHtml(html), '备用公众号');
});
