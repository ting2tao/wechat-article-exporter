export interface AccountLike {
  fakeid: string;
  completed: boolean;
  count: number;
  articles: number;
  nickname?: string;
  round_head_img?: string;
  total_count: number;
  create_time?: number;
  update_time?: number;
  last_update_time?: number;
}

function getFreshnessScore(account: AccountLike) {
  return account.update_time || account.last_update_time || account.create_time || 0;
}

function mergeAccount(local: AccountLike | undefined, worker: AccountLike | undefined): AccountLike {
  if (!local && !worker) {
    throw new Error('mergeAccount requires at least one account');
  }
  if (!local) {
    return { ...worker! };
  }
  if (!worker) {
    return { ...local };
  }

  const preferWorker = getFreshnessScore(worker) >= getFreshnessScore(local);
  const primary = preferWorker ? worker : local;
  const secondary = preferWorker ? local : worker;

  return {
    ...secondary,
    ...primary,
    fakeid: primary.fakeid,
    nickname: primary.nickname || secondary.nickname,
    round_head_img: primary.round_head_img || secondary.round_head_img,
    completed: primary.completed ?? secondary.completed,
    count: primary.count,
    articles: primary.articles,
    total_count: primary.total_count,
    create_time: primary.create_time ?? secondary.create_time,
    update_time: primary.update_time ?? secondary.update_time,
    last_update_time: primary.last_update_time ?? secondary.last_update_time,
  };
}

export function mergeAccountLists(localAccounts: AccountLike[], workerAccounts: AccountLike[]) {
  const workerMap = new Map(workerAccounts.map(account => [account.fakeid, account]));
  const merged = localAccounts.map(account => {
    const worker = workerMap.get(account.fakeid);
    if (worker) {
      workerMap.delete(account.fakeid);
    }
    return mergeAccount(account, worker);
  });

  for (const account of workerMap.values()) {
    merged.push({ ...account });
  }

  return merged;
}
