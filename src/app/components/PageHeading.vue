<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; description: string }>();
</script>

<template>
  <div class="mb-9 flex flex-wrap items-end justify-between gap-6">
    <div>
      <p v-if="eyebrow" class="eyebrow mb-3 text-emerald-800">{{ eyebrow }}</p>
      <h1 class="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{{ title }}</h1>
      <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
