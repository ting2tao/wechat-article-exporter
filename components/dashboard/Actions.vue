<script setup lang="ts">
import { gotoLink } from '~/utils';
</script>

<template>
  <ul class="hidden md:flex items-center gap-5">
    <!-- GitHub -->
    <li>
      <UTooltip text="GitHub">
        <UIcon
          @click="gotoLink('https://github.com/ting2tao/wx-articles-manage')"
          name="i-lucide:github"
          class="size-7 text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors"
        />
      </UTooltip>
    </li>
  </ul>
</template>
