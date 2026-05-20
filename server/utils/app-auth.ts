import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createError, deleteCookie, getCookie, H3Event, setCookie } from 'h3';

const APP_AUTH_CREDENTIALS_KEY = 'app-auth:credentials';
const APP_AUTH_SESSION_PREFIX = 'app-auth:session:';
const APP_AUTH_SESSION_COOKIE = 'app-auth-session';
const APP_AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = '121212';
const DEFAULT_PASSWORD_SALT = 'wx-exporter-default-auth-salt';

interface AppAuthCredentialRecord {
  username: string;
  passwordHash: string;
  salt: string;
  updatedAt: number;
  version: number;
}

interface AppAuthSessionRecord {
  username: string;
  version: number;
  createdAt: number;
}

export interface AppAuthSession {
  username: string;
}

function getAuthStorage() {
  return useStorage('kv');
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createCredentialRecord(
  username: string,
  password: string,
  salt: string,
  version: number,
  updatedAt = Date.now()
): AppAuthCredentialRecord {
  return {
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    updatedAt,
    version,
  };
}

function getDefaultCredentials(): AppAuthCredentialRecord {
  return createCredentialRecord(DEFAULT_USERNAME, DEFAULT_PASSWORD, DEFAULT_PASSWORD_SALT, 1, 0);
}

async function getCredentials(): Promise<AppAuthCredentialRecord> {
  const stored = await getAuthStorage().get<AppAuthCredentialRecord>(APP_AUTH_CREDENTIALS_KEY);
  return stored || getDefaultCredentials();
}

function getSessionStorageKey(token: string): string {
  return `${APP_AUTH_SESSION_PREFIX}${token}`;
}

function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, APP_AUTH_SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: APP_AUTH_SESSION_TTL_SECONDS,
  });
}

function clearSessionCookie(event: H3Event) {
  deleteCookie(event, APP_AUTH_SESSION_COOKIE, {
    path: '/',
  });
}

async function destroySessionByToken(token: string): Promise<void> {
  try {
    await getAuthStorage().removeItem(getSessionStorageKey(token));
  } catch (error) {
    console.error('删除系统登录会话失败:', error);
  }
}

export async function createAppSession(
  event: H3Event,
  username: string,
  version: number
): Promise<AppAuthSessionRecord> {
  const token = randomBytes(32).toString('hex');
  const session: AppAuthSessionRecord = {
    username,
    version,
    createdAt: Date.now(),
  };

  await getAuthStorage().set<AppAuthSessionRecord>(getSessionStorageKey(token), session, {
    ttl: APP_AUTH_SESSION_TTL_SECONDS,
  });

  setSessionCookie(event, token);
  return session;
}

export async function clearAppSession(event: H3Event): Promise<void> {
  const token = getCookie(event, APP_AUTH_SESSION_COOKIE);

  if (token) {
    await destroySessionByToken(token);
  }

  clearSessionCookie(event);
}

export async function getAppSession(event: H3Event): Promise<AppAuthSession | null> {
  const token = getCookie(event, APP_AUTH_SESSION_COOKIE);
  if (!token) {
    return null;
  }

  const session = await getAuthStorage().get<AppAuthSessionRecord>(getSessionStorageKey(token));
  if (!session) {
    clearSessionCookie(event);
    return null;
  }

  const credentials = await getCredentials();
  if (session.username !== credentials.username || session.version !== credentials.version) {
    await destroySessionByToken(token);
    clearSessionCookie(event);
    return null;
  }

  return {
    username: session.username,
  };
}

export async function requireAppSession(event: H3Event): Promise<AppAuthSession> {
  const session = await getAppSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录系统',
    });
  }

  return session;
}

export async function loginWithPassword(event: H3Event, username: string, password: string): Promise<AppAuthSession> {
  const normalizedUsername = username.trim();
  const credentials = await getCredentials();
  const passwordHash = hashPassword(password, credentials.salt);

  if (normalizedUsername !== credentials.username || !safeCompare(passwordHash, credentials.passwordHash)) {
    throw createError({
      statusCode: 401,
      statusMessage: '账号或密码错误',
    });
  }

  await createAppSession(event, credentials.username, credentials.version);

  return {
    username: credentials.username,
  };
}

export async function updateAppCredentials(
  event: H3Event,
  currentPassword: string,
  nextUsername: string,
  nextPassword: string
): Promise<AppAuthSession> {
  const currentCredentials = await getCredentials();
  const currentPasswordHash = hashPassword(currentPassword, currentCredentials.salt);

  if (!safeCompare(currentPasswordHash, currentCredentials.passwordHash)) {
    throw createError({
      statusCode: 400,
      statusMessage: '当前密码不正确',
    });
  }

  const username = nextUsername.trim();
  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: '账号不能为空',
    });
  }

  if (!nextPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: '新密码不能为空',
    });
  }

  const salt = randomBytes(16).toString('hex');
  const credentials = createCredentialRecord(username, nextPassword, salt, currentCredentials.version + 1);
  await getAuthStorage().set<AppAuthCredentialRecord>(APP_AUTH_CREDENTIALS_KEY, credentials);

  await createAppSession(event, credentials.username, credentials.version);

  return {
    username: credentials.username,
  };
}
