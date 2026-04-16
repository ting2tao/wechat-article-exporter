import assert from 'node:assert/strict';
import test from 'node:test';

const authCookie = await import(new URL('../server/utils/auth-cookie.ts', import.meta.url).href);

test('buildMpAuthCookies omits Secure on http requests', () => {
  const cookies = authCookie.buildMpAuthCookies('auth-token', false, new Date('2026-04-20T00:00:00Z'));

  assert.equal(cookies[0].includes('auth-key=auth-token'), true);
  assert.equal(cookies[0].includes('HttpOnly'), true);
  assert.equal(cookies[0].includes('Secure'), false);
  assert.equal(cookies[1].includes('uuid=EXPIRED'), true);
  assert.equal(cookies[1].includes('Secure'), false);
});

test('buildMpAuthCookies keeps Secure on https requests', () => {
  const cookies = authCookie.buildMpAuthCookies('auth-token', true, new Date('2026-04-20T00:00:00Z'));

  assert.equal(cookies[0].includes('Secure'), true);
  assert.equal(cookies[1].includes('Secure'), true);
});
