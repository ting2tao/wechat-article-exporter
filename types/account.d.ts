import type { MpAccount } from '~/store/v2/info';
import type { ACCOUNT_MANIFEST_USEFOR_VALUES } from '~/config';

export type AccountManifestUsefor = (typeof ACCOUNT_MANIFEST_USEFOR_VALUES)[number];

export interface AccountManifest {
  version: string;
  usefor: AccountManifestUsefor;
  accounts: MpAccount[];
}
