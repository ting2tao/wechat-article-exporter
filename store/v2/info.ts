export interface MpAccount {
  fakeid: string;
  completed: boolean;
  count: number;
  articles: number;

  // 公众号昵称
  nickname?: string;
  // 公众号头像
  round_head_img?: string;

  // 公众号文章总数
  total_count: number;
  create_time?: number;
  update_time?: number;

  // 最后更新时间
  last_update_time?: number;
}

/**
 * 更新 account 缓存
 * @param mpAccount
 */
export async function updateInfoCache(mpAccount: MpAccount): Promise<void> {
  await $fetch('/api/web/data/accounts/upsert', {
    method: 'POST',
    body: { accounts: [mpAccount] },
  });
}

export async function updateLastUpdateTime(fakeid: string): Promise<void> {
  await $fetch(`/api/web/data/accounts/${fakeid}/last-update`, {
    method: 'PUT',
  });
}

/**
 * 获取 info 缓存
 * @param fakeid
 */
export async function getInfoCache(fakeid: string): Promise<MpAccount | undefined> {
  try {
    return await $fetch(`/api/web/data/accounts/${fakeid}`);
  } catch {
    return undefined;
  }
}

export async function getAllInfo(): Promise<MpAccount[]> {
  return $fetch('/api/web/data/accounts');
}

export async function replaceAllInfo(mpAccounts: MpAccount[]): Promise<void> {
  await $fetch('/api/web/data/accounts/replace', {
    method: 'POST',
    body: { accounts: mpAccounts },
  });
}

// 获取公众号的名称
export async function getAccountNameByFakeid(fakeid: string): Promise<string | null> {
  const account = await getInfoCache(fakeid);
  if (!account) {
    return null;
  }

  return account.nickname || null;
}

// 批量导入公众号
export async function importMpAccounts(mpAccounts: MpAccount[]): Promise<void> {
  await $fetch('/api/web/data/accounts/import', {
    method: 'POST',
    body: { accounts: mpAccounts },
  });
}
