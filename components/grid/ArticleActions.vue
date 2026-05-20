<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';

interface Props {
  params: ICellRendererParams & {
    onGotoLink?: (params: ICellRendererParams) => void;
    onPreview?: (params: ICellRendererParams) => void;
  };
}
const props = defineProps<Props>();

function gotoLink() {
  props.params.onGotoLink && props.params.onGotoLink(props.params);
}
function preview() {
  props.params.onPreview && props.params.onPreview(props.params);
}
</script>

<template>
  <div class="grid-action-group">
    <UTooltip text="访问原文" :popper="{ placement: 'top' }">
      <UButton icon="i-lucide:external-link" color="gray" size="xs" square variant="soft" class="grid-action-button" @click="gotoLink" />
    </UTooltip>
    <UTooltip text="预览" :popper="{ placement: 'top' }">
      <UButton
        :disabled="params.data.downloading"
        icon="i-heroicons:fire-16-solid"
        :color="params.data.contentDownload ? 'blue' : 'gray'"
        size="xs"
        square
        variant="soft"
        class="grid-action-button"
        @click="preview"
      />
    </UTooltip>
  </div>
</template>

<style scoped>
.grid-action-group {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  padding: 0.16rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.94) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.grid-action-group :deep(button) {
  min-height: 1.7rem;
  min-width: 1.7rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.grid-action-group :deep(button:hover:not(:disabled)) {
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(239, 246, 255, 0.92);
}

.grid-action-group :deep(button:disabled) {
  opacity: 0.62;
}
</style>
