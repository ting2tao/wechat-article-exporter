import type { MpAccount } from '~/store/v2/info';

export interface AccountManifest {
  version: string;
  usefor: 'wx-articles-manage';
  accounts: MpAccount[];
}
