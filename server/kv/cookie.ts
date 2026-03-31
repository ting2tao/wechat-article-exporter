import { type CookieEntity } from '~/server/utils/CookieStore';

export type CookieKVKey = string;
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 4;

export interface CookieKVValue {
  token: string;
  cookies: CookieEntity[];
}

export interface CookieKVWriteResult {
  persisted: boolean;
  error?: string;
}

function normalizeStorageError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function setMpCookie(key: CookieKVKey, data: CookieKVValue): Promise<CookieKVWriteResult> {
  const kv = useStorage('kv');
  try {
    await kv.set<CookieKVValue>(`cookie:${key}`, data, {
      ttl: COOKIE_TTL_SECONDS,
    });
    return {
      persisted: true,
    };
  } catch (err) {
    console.error('kv.set call failed:', err);
    return {
      persisted: false,
      error: normalizeStorageError(err),
    };
  }
}

export async function getMpCookie(key: CookieKVKey): Promise<CookieKVValue | null> {
  const kv = useStorage('kv');
  return await kv.get<CookieKVValue>(`cookie:${key}`);
}
