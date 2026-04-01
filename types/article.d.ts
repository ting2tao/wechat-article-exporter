import type { AppMsgExWithFakeID } from '~/types/types';

export interface Article extends AppMsgExWithFakeID {
  /**
   * 文章内容是否已下载
   */
  contentDownload: boolean;
}
