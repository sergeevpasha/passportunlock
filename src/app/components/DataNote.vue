<script setup lang="ts">
import { dateLabel } from '~/utils/entry';
defineProps<{ date?: string }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-6 text-stone-500">
    <span class="inline-flex items-center gap-2"
      ><span class="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Updated<span v-if="date">
        {{ dateLabel(date) }}</span
      ></span
    >
    <NuxtLink to="/about" class="underline decoration-stone-300 underline-offset-4 hover:text-emerald-800"
      >About the data</NuxtLink
    >
  </div>
</template>
