import dayjs from 'dayjs';
import { normalizeAlertWebhookUrl } from '~/server/services/worker/config-helpers';
import { getSchedulerConfig } from '~/server/services/worker/repository';

const NOTIFY_DEDUP_PREFIX = 'worker-notify:';

interface WorkerNotifyPayload {
  title: string;
  lines?: string[];
  dedupeKey?: string;
  cooldownMs?: number;
  scopeId?: string | null;
}

function getStorage() {
  return useStorage('kv');
}

async function shouldSendNotification(dedupeKey?: string, cooldownMs = 0) {
  if (!dedupeKey || cooldownMs <= 0) {
    return true;
  }

  const storageKey = `${NOTIFY_DEDUP_PREFIX}${dedupeKey}`;
  const lastSentAt = await getStorage().get<number>(storageKey);
  return !lastSentAt || Date.now() - lastSentAt >= cooldownMs;
}

async function markNotificationSent(dedupeKey?: string, cooldownMs = 0) {
  if (!dedupeKey || cooldownMs <= 0) {
    return;
  }

  const storageKey = `${NOTIFY_DEDUP_PREFIX}${dedupeKey}`;
  await getStorage().set(storageKey, Date.now(), {
    ttl: Math.max(1, Math.ceil(cooldownMs / 1000)),
  });
}

export async function notifyWorkerStatus(payload: WorkerNotifyPayload) {
  const webhookUrl = normalizeAlertWebhookUrl((await getSchedulerConfig(payload.scopeId)).alertWebhookUrl);
  if (!webhookUrl) {
    return false;
  }

  const dedupeKey = payload.scopeId ? `${payload.scopeId}:${payload.dedupeKey || payload.title}` : payload.dedupeKey;
  if (!(await shouldSendNotification(dedupeKey, payload.cooldownMs))) {
    return false;
  }

  const lines = [payload.title, `时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, ...(payload.lines || [])];

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'text',
        text: {
          content: lines.join('\n'),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as { errcode?: number; errmsg?: string };
    if (result.errcode !== 0) {
      throw new Error(result.errmsg || `errcode=${result.errcode}`);
    }

    await markNotificationSent(dedupeKey, payload.cooldownMs);
    return true;
  } catch (error) {
    console.error('企业微信 webhook 推送失败:', error);
    return false;
  }
}
