<script setup lang="ts">
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/stackoverflow-dark.css';
import { Check, Copy } from 'lucide-vue-next';

hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);

interface Props {
  code: Record<string, any> | string;
  lang: 'json' | 'xml' | 'text';
}
const props = defineProps<Props>();

const code = computed(() => {
  if (typeof props.code === 'string') {
    return props.code;
  } else if (typeof props.code === 'object') {
    return JSON.stringify(props.code, null, 2);
  } else {
    throw new Error(`Unknown code: ${JSON.stringify(props.code)}`);
  }
});
const hlCode = computed(() => {
  if (props.lang === 'text') {
    return `<span class="text-xl">${code.value}</span>`;
  }
  return hljs.highlight(code.value, { language: props.lang }).value;
});

const copied = ref(false);
function copy() {
  navigator.clipboard.writeText(code.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1000);
}
</script>

<template>
  <div class="code-segment">
    <pre class="code-segment__pre no-scrollbar"
      ><Check v-if="copied" class="code-segment__icon absolute right-3 top-3 size-5" /><Copy
        v-else
        class="code-segment__icon absolute right-3 top-3 size-5 cursor-pointer"
        @click="copy"
      /><span v-html="hlCode"></span
    ></pre>
  </div>
</template>

<style scoped>
.code-segment {
  position: relative;
}

.code-segment__pre {
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
  color: rgba(226, 232, 240, 0.8);
}

.code-segment__icon {
  color: rgba(148, 163, 184, 0.78);
  transition: color 180ms ease;
}

.code-segment__icon:hover {
  color: rgba(241, 245, 249, 0.96);
}
</style>
