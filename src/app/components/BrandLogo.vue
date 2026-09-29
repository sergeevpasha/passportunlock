<script setup lang="ts">
withDefaults(defineProps<{ src?: string }>(), {
  src: '/brand/passport-fold.svg',
});
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <img :src="src" alt="" width="48" height="48" class="h-12 w-12 shrink-0 object-contain" />
    <img src="/brand/logo-wordmark.svg" alt="" width="172" height="21" class="h-[21px] w-auto" />
  </span>
</template>
