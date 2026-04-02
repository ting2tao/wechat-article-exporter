<template>
  <div class="album-page">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">合集</h1>
    </Teleport>

    <div class="album-page__shell">
      <header class="album-page__toolbar">
        <div class="album-page__controls">
          <AccountSelectorForAlbum v-model="selectedAccount" class="album-page__selector" />
          <USelectMenu
            class="album-page__field"
            color="gray"
            v-model="selectedAlbum"
            :options="selectedAccount?.albums || []"
            option-attribute="title"
            size="md"
            placeholder="选择合集"
          />
          <button type="button" class="album-page__sort" @click="toggleReverse">
            <Loader v-if="switchSortLoading" :size="18" class="animate-spin text-slate-500" />
            <template v-else>
              <ArrowUpNarrowWide v-if="isReverse" />
              <ArrowDownNarrowWide v-else />
              <span>{{ isReverse ? '正序' : '倒序' }}</span>
            </template>
          </button>
          <div class="album-page__meta" v-if="selectedAlbum">
            <span class="album-page__meta-label">已加载</span>
            <span class="album-page__meta-value">{{ albumArticles.length }} 篇</span>
          </div>
        </div>

        <div class="album-page__actions">
          <UButton
            color="black"
            variant="solid"
            class="disabled:bg-slate-4 disabled:text-slate-12"
            :loading="fetchAllArticlesBtnLoading"
            :disabled="!selectedAccount || !selectedAlbum || albumArticles.length === 0 || noMoreData"
            @click="fetchAllArticles"
          >
            抓取全部文章链接
          </UButton>
          <UButton
            color="blue"
            variant="soft"
            :disabled="!selectedAccount || !selectedAlbum"
            @click="gotoLink(originalAlbumURL)"
          >
            原始链接
          </UButton>
          <UButton
            color="black"
            variant="solid"
            class="disabled:bg-slate-4 disabled:text-slate-12"
            :disabled="!selectedAccount || !selectedAlbum || albumArticles.length === 0 || batchDownloadLoading"
            @click="doBatchDownload"
          >
            <Loader v-if="batchDownloadLoading" :size="20" class="animate-spin" />
            <span v-if="batchDownloadLoading"
              >{{ batchDownloadPhase }}:
              <span v-if="batchDownloadPhase === '下载文章内容'"
                >{{ batchDownloadedCount }}/{{ selectedArticleCount }}</span
              >
              <span v-if="batchDownloadPhase === '打包'">{{ batchPackedCount }}/{{ batchDownloadedCount }}</span>
            </span>
            <span v-else>批量下载</span>
          </UButton>
        </div>
      </header>

      <main class="album-page__content" v-if="selectedAccount && selectedAlbum">
        <div v-if="albumLoading" class="flex justify-center items-center mt-5">
          <Loader :size="28" class="animate-spin text-slate-500" />
        </div>
        <div v-else-if="albumBaseInfo" class="album-page__feed">
          <div class="px-5 py-7 banner">
            <h2 class="text-2xl text-white font-bold"># {{ albumBaseInfo.title }}</h2>
          </div>
          <div class="sticky top-0 px-5 py-3 bg-white/96 border-b backdrop-blur-sm">
            <p class="flex items-center space-x-2 mb-2">
              <img class="size-5" :src="albumBaseInfo.brand_icon" alt="" />
              <span>{{ albumBaseInfo.nickname }}</span>
            </p>
            <p class="text-sm text-slate-10">
              <span>{{ albumBaseInfo.article_count }}篇内容</span>
              <span v-if="albumBaseInfo.description"> · {{ albumBaseInfo.description }}</span>
            </p>
          </div>
          <div class="bg-white px-4 pb-6">
            <!-- 文章列表 -->
            <ul class="divide-y">
              <li
                class="flex justify-between items-center py-5 px-1"
                v-for="article in albumArticles"
                :key="article.key"
              >
                <div class="flex-1">
                  <h3 class="text-lg mb-2">
                    <span v-if="article.pos_num">{{ article.pos_num }}. </span>
                    <span>{{ article.title }}</span>
                  </h3>
                  <time class="text-sm text-slate-10">{{ formatAlbumTime(+article.create_time) }}</time>
                </div>
                <img class="size-16 ml-4 flex-shrink-0" :src="article.cover_img_1_1" alt="" />
              </li>
            </ul>

            <!-- 底部加载条 -->
            <div v-element-visibility="onElementVisibility"></div>
            <p v-if="articleLoading" class="flex justify-center items-center mt-2 py-2">
              <Loader :size="28" class="animate-spin text-slate-500" />
            </p>
            <p v-else-if="noMoreData" class="text-center mt-2 py-2 text-slate-400">已全部加载完毕</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { vElementVisibility } from '@vueuse/components';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Loader } from 'lucide-vue-next';
import { sleep } from '#shared/utils/helpers';
import { request } from '#shared/utils/request';
import AccountSelectorForAlbum from '~/components/selector/AccountSelectorForAlbum.vue';
import { useDownloadAlbum } from '~/composables/useBatchDownload';
import { websiteName } from '~/config';
import { type MpAccount } from '~/store/v2/info';
import type { AppMsgAlbumResult, ArticleItem, BaseInfo } from '~/types/album';
import type { AppMsgAlbumInfo, DownloadableArticle } from '~/types/types';
import { gotoLink } from '~/utils';
import { formatAlbumTime } from '~/utils/album';

useHead({
  title: `合集 | ${websiteName}`,
});

interface AccountInfo extends MpAccount {
  albums?: AppMsgAlbumInfo[];
}

// 已选择的公众号
const selectedAccount = ref<AccountInfo | undefined>();
const downloadFileName = computed(() => {
  return (selectedAccount.value!.nickname || selectedAccount.value!.fakeid) + '-' + selectedAlbum.value!.title;
});

watch(selectedAccount, () => {
  selectedAlbum.value = undefined;
});

// 已选择的合集
const selectedAlbum = ref<AppMsgAlbumInfo | undefined>();

// 切换合集时，重置状态
watch(selectedAlbum, value => {
  isReverse.value = true;
  articleLoading.value = false;
  switchSortLoading.value = false;
  getFirstPageAlbumData().catch(e => {
    console.warn(e);
  });
});

// 合集的原始地址
const originalAlbumURL = computed(() => {
  if (selectedAccount.value && selectedAlbum.value) {
    return `https://mp.weixin.qq.com/mp/appmsgalbum?__biz=${selectedAccount.value.fakeid}&action=getalbum&album_id=${selectedAlbum.value.id}`;
  }
  return '';
});

const albumArticles: ArticleItem[] = reactive([]);
const albumBaseInfo = ref<BaseInfo | null>(null);

const isReverse = ref(true);
const albumLoading = ref(false);
const articleLoading = ref(false);
const switchSortLoading = ref(false);

const controller = ref<AbortController | null>(null);

// 加载合集第一页数据
async function getFirstPageAlbumData(refreshPage = true) {
  if (refreshPage) {
    albumLoading.value = true;
  } else {
    switchSortLoading.value = true;
  }

  if (controller.value) {
    (controller.value as AbortController).abort('切换tab，取消pending中的请求');
  }
  controller.value = new AbortController();
  const data = await request<AppMsgAlbumResult>('/api/web/misc/appmsgalbum', {
    query: {
      fakeid: selectedAccount.value!.fakeid,
      album_id: selectedAlbum.value!.id,
      is_reverse: isReverse.value ? '1' : '0',
    },
    signal: controller.value.signal,
  });

  controller.value = null;

  if (refreshPage) {
    albumLoading.value = false;
  } else {
    switchSortLoading.value = false;
  }

  albumArticles.length = 0;
  if (data.base_resp.ret === 0) {
    albumBaseInfo.value = data.getalbum_resp.base_info;
    if (Array.isArray(data.getalbum_resp.article_list)) {
      albumArticles.push(...data.getalbum_resp.article_list);
    } else {
      albumArticles.push(data.getalbum_resp.article_list);
    }
    noMoreData.value = data.getalbum_resp.continue_flag === '0';
  }
}

// 切换正序/倒序
function toggleReverse() {
  if (!selectedAccount.value || !selectedAlbum.value) {
    return;
  }

  isReverse.value = !isReverse.value;

  getFirstPageAlbumData(false).catch(e => {
    console.warn(e);
  });
}

// 加载合集后续数据
async function loadMoreData() {
  articleLoading.value = true;

  if (controller.value) {
    (controller.value as AbortController).abort('加载更多数据，取消pending中的请求');
  }
  controller.value = new AbortController();

  const lastArticle = albumArticles[albumArticles.length - 1];
  const data = await request<AppMsgAlbumResult>('/api/web/misc/appmsgalbum', {
    query: {
      fakeid: selectedAccount.value!.fakeid,
      album_id: selectedAlbum.value!.id,
      is_reverse: isReverse.value ? '1' : '0',
      begin_msgid: lastArticle?.msgid,
      begin_itemidx: lastArticle?.itemidx,
    },
    signal: controller.value.signal,
  });
  controller.value = null;
  articleLoading.value = false;

  if (data.base_resp.ret === 0) {
    if (Array.isArray(data.getalbum_resp.article_list)) {
      albumArticles.push(...data.getalbum_resp.article_list);
    } else {
      albumArticles.push(data.getalbum_resp.article_list);
    }
    noMoreData.value = data.getalbum_resp.continue_flag === '0';
  }
}

const noMoreData = ref(false);
// 判断是否触底
const bottomElementIsVisible = ref(false);

function onElementVisibility(visible: boolean) {
  bottomElementIsVisible.value = visible;
  if (visible && !noMoreData.value && !articleLoading.value) {
    loadMoreData().catch(e => {
      console.warn(e);
    });
  }
}

const {
  loading: batchDownloadLoading,
  phase: batchDownloadPhase,
  downloadedCount: batchDownloadedCount,
  packedCount: batchPackedCount,
  download: batchDownload,
} = useDownloadAlbum();
const selectedArticleCount = ref(0);

function doBatchDownload() {
  const articles: DownloadableArticle[] = albumArticles.map(article => ({
    fakeid: selectedAccount.value!.fakeid,
    title: article.title,
    url: article.url,
    date: +article.create_time,
  }));
  selectedArticleCount.value = articles.length;
  const filename = downloadFileName.value;
  batchDownload(articles, filename);
}

// 抓取全部文章链接
const fetchAllArticlesBtnLoading = ref(false);
async function fetchAllArticles() {
  fetchAllArticlesBtnLoading.value = true;
  while (!noMoreData.value) {
    await loadMoreData();
    await sleep(500);
  }
  fetchAllArticlesBtnLoading.value = false;
}
</script>

<style scoped>
.album-page {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 1rem;
}

.album-page__shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.65rem;
}

.album-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.9rem;
  padding: 0.75rem 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.album-page__toolbar :deep(button) {
  min-height: 2.35rem;
  border-radius: 0.78rem;
}

.album-page__controls,
.album-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}

.album-page__selector {
  min-width: 15rem;
}

.album-page__field {
  min-width: 13rem;
}

.album-page__sort {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.55rem;
  padding: 0 0.8rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #111111;
  cursor: pointer;
}

.album-page__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 0.42rem 0.6rem;
  background: rgba(255, 255, 255, 0.9);
}

.album-page__meta-label {
  color: rgba(15, 23, 42, 0.46);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.album-page__meta-value {
  color: #111111;
  font-size: 0.84rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.album-page__content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  border-radius: 0.9rem;
  background: rgba(240, 244, 249, 0.92);
}

.album-page__feed {
  position: relative;
  max-width: 42rem;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 0.9rem;
  background: white;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.banner {
  background: linear-gradient(135deg, #0f1723 0%, #1d2735 100%);
}

@media (max-width: 768px) {
  .album-page {
    padding: 0.75rem;
  }

  .album-page__toolbar,
  .album-page__content {
    padding: 0.72rem;
  }

  .album-page__toolbar {
    justify-content: flex-start;
  }

  .album-page__actions {
    width: 100%;
  }
}
</style>
