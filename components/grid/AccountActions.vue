<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import { Loader } from 'lucide-vue-next';

interface Props {
  params: ICellRendererParams & {
    onSync?: (params: ICellRendererParams) => void;
    onStop?: (params: ICellRendererParams) => void;
    isDeleting: boolean;
    isSyncing: boolean;
    syncingRowId: string | null;
  };
}
const props = defineProps<Props>();

function sync() {
  props.params.onSync && props.params.onSync(props.params);
}
function stop() {
  props.params.onStop && props.params.onStop(props.params);
}
const isDisabled = computed(() => props.params.isDeleting || props.params.isSyncing);
const isLoading = computed(() => props.params.isSyncing && props.params.node.id === props.params.syncingRowId);
</script>

<template>
  <div class="account-grid-action">
    <UButton v-if="isLoading" color="rose" size="xs" variant="soft" class="account-grid-action__button" @click="stop">
      <Loader :size="14" class="animate-spin" />
      停止
    </UButton>
    <UButton
      v-else
      icon="i-heroicons:arrow-path-rounded-square-20-solid"
      color="gray"
      size="xs"
      variant="soft"
      class="account-grid-action__button"
      :disabled="isDisabled"
      @click="sync"
    />
  </div>
</template>

<style scoped>
.account-grid-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  padding: 0.16rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.94) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.account-grid-action :deep(button) {
  min-height: 1.72rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.account-grid-action :deep(button:hover:not(:disabled)) {
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(239, 246, 255, 0.92);
}
</style>
