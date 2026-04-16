export const MP_REQUEST_TIMEOUT_MS = 30_000;

export type FetchLike = typeof fetch;

function isTimeoutError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'TimeoutError' || error.name === 'AbortError'
    : error instanceof Error && /aborted|timeout/i.test(error.message);
}

export async function fetchMpRequest(
  input: string | URL | Request,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
  timeoutMs = MP_REQUEST_TIMEOUT_MS
) {
  try {
    return await fetchImpl(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('微信接口请求超时，请稍后重试');
    }

    throw error;
  }
}
