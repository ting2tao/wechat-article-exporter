import assert from 'node:assert/strict';
import test from 'node:test';

const mpRequest = await import(new URL('../server/services/worker/mp-request.ts', import.meta.url).href);

test('fetchMpRequest aborts stalled requests with a readable timeout error', async () => {
  const fetchImpl = (_input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('missing signal'));
        return;
      }

      signal.addEventListener(
        'abort',
        () => {
          reject(signal.reason ?? new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
        },
        { once: true }
      );
    });

  await assert.rejects(
    mpRequest.fetchMpRequest('https://example.com/stalled', { headers: { Cookie: 'token=1' } }, fetchImpl, 10),
    /微信接口请求超时/
  );
});
