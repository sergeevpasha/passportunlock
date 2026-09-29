<script setup lang="ts">
import { iconPaths, type IconName } from '~/utils/icons';
withDefaults(defineProps<{ name?: IconName; size?: number }>(), { name: 'globe', size: 20 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path :d="iconPaths[name]" />
  </svg>
</template>
