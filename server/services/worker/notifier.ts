import dayjs from 'dayjs';
import { getSchedulerConfig } from '~/server/services/worker/repository';

const NOTIFY_DEDUP_PREFIX = 'worker-notify:';

interface WorkerNotifyPayload {
  title: string;
  lines?: string[];
  dedupeKey?: string;
  cooldownMs?: number;
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
  const webhookUrl = (await getSchedulerConfig()).alertWebhookUrl.trim();
  if (!webhookUrl) {
    return false;
  }

  if (!(await shouldSendNotification(payload.dedupeKey, payload.cooldownMs))) {
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

    await markNotificationSent(payload.dedupeKey, payload.cooldownMs);
    return true;
  } catch (error) {
    console.error('企业微信 webhook 推送失败:', error);
    return false;
  }
}
