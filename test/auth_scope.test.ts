import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScopedDexieName, parseScopeIdFromStoredLogin } from '../utils/auth-scope.ts';

test('parseScopeIdFromStoredLogin returns null for malformed values', () => {
  assert.equal(parseScopeIdFromStoredLogin(''), null);
  assert.equal(parseScopeIdFromStoredLogin('{'), null);
  assert.equal(parseScopeIdFromStoredLogin(JSON.stringify({ nickname: '公众号' })), null);
});

test('parseScopeIdFromStoredLogin reads scopeId from stored login JSON', () => {
  const raw = JSON.stringify({
    nickname: '公众号',
    scopeId: 'scope-123',
  });

  assert.equal(parseScopeIdFromStoredLogin(raw), 'scope-123');
});

test('buildScopedDexieName isolates different scopes into different databases', () => {
  assert.equal(buildScopedDexieName('scope-a'), 'exporter.wxdown.online::scope-a');
  assert.equal(buildScopedDexieName('scope-b'), 'exporter.wxdown.online::scope-b');
});
