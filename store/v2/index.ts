// 删除公众号数据
export async function deleteAccountData(ids: string[]): Promise<void> {
  await $fetch('/api/web/data/delete-accounts', {
    method: 'POST',
    body: { fakeids: ids },
  });
}
