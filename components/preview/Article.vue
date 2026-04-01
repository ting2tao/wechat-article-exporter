<template>
  <div>
    <USlideover v-model="isOpen" :ui="{ width: 'max-w-[720px]' }">
      <HtmlRenderer :html="articleHtml" v-model:show="isOpen" />
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { parseCgiDataNew } from '#shared/utils/html';
import { renderHTMLFromCgiDataNew } from '#shared/utils/renderer';
import HtmlRenderer from '~/components/preview/HtmlRenderer.vue';
import toastFactory from '~/composables/toast';
import { getHtmlCache } from '~/store/v2/html';
import type { AppMsgEx } from '~/types/types';

defineExpose({
  open: open,
});

const toast = toastFactory();

const isOpen = ref(false);
const articleHtml = ref('');

async function open(article: AppMsgEx) {
  const htmlAsset = await getHtmlCache(article.link);
  if (!htmlAsset) {
    toast.warning('文章预览失败', `文章【${article.title}】还未拉取文章内容`);
    return;
  }

  isOpen.value = true;
  const rawHtml = await htmlAsset.file.text();
  const cgiData = await parseCgiDataNew(rawHtml);
  articleHtml.value = await renderHTMLFromCgiDataNew(cgiData);
}
</script>
