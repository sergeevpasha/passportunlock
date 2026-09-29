<script setup lang="ts">
const props = withDefaults(defineProps<{ code: string; shape?: 'round' | 'wide'; size?: number; eager?: boolean }>(), {
  shape: 'round',
  size: 28,
});
const src = computed(() => `/flags/${props.shape === 'round' ? '1x1' : '4x3'}/${props.code.toLowerCase()}.svg`);
</script>

<template>
  <img
    :src="src"
    alt=""
    :width="shape === 'round' ? size : Math.round((size * 4) / 3)"
    :height="size"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="inline-block shrink-0 bg-stone-100 object-cover ring-1 ring-black/5"
    :class="shape === 'round' ? 'rounded-full' : 'rounded-sm'"
  />
</template>
