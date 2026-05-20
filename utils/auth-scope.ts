export function parseScopeIdFromStoredLogin(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { scopeId?: unknown };
    return typeof parsed.scopeId === 'string' && parsed.scopeId.trim() ? parsed.scopeId.trim() : null;
  } catch {
    return null;
  }
}

export function getStoredScopeId(): string | null {
  if (!import.meta.client) {
    return null;
  }

  return parseScopeIdFromStoredLogin(window.localStorage.getItem('login'));
}

export function requireStoredScopeId(): string {
  const scopeId = getStoredScopeId();
  if (!scopeId) {
    throw new Error('当前未绑定登录作用域，请重新扫码登录公众号后台');
  }

  return scopeId;
}
