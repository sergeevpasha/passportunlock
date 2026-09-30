<script setup lang="ts">
// Every cover is 2:3 with the same outline. The 160px files suit cards; wider covers use the 480px files.
const props = withDefaults(defineProps<{ code: string; width?: number; alt?: string; eager?: boolean }>(), {
  width: 56,
  alt: '',
});
const src = computed(() => `/covers/${props.width > 80 ? 480 : 160}/${props.code.toLowerCase()}.webp`);
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="width * 1.5"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
    class="h-auto shrink-0 drop-shadow-[0_3px_6px_rgb(28_25_23/0.22)]"
  />
</template>
