const SCOPE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Persist authKey → fakeid mapping to KV
 */
export async function setScopeMapping(authKey: string, fakeid: string): Promise<void> {
  const kv = useStorage('kv');
  try {
    await kv.setItem(`scope:${authKey}`, fakeid, { ttl: SCOPE_TTL_SECONDS });
  } catch (err) {
    console.error('[scope-kv] setScopeMapping failed:', err);
  }
}

/**
 * Retrieve fakeid by authKey from KV
 */
export async function getScopeMapping(authKey: string): Promise<string | null> {
  const kv = useStorage('kv');
  try {
    const fakeid = await kv.getItem<string>(`scope:${authKey}`);
    return fakeid || null;
  } catch (err) {
    console.error('[scope-kv] getScopeMapping failed:', err);
    return null;
  }
}

/**
 * Remove authKey → fakeid mapping from KV
 */
export async function deleteScopeMapping(authKey: string): Promise<void> {
  const kv = useStorage('kv');
  try {
    await kv.removeItem(`scope:${authKey}`);
  } catch (err) {
    console.error('[scope-kv] deleteScopeMapping failed:', err);
  }
}
