<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>();
</script>

<template>
  <div class="mb-9 flex flex-wrap items-end justify-between gap-6">
    <div>
      <p class="mb-3 text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase">{{ eyebrow }}</p>
      <h1 class="text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-5xl">{{ title }}</h1>
      <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-500 sm:text-base">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
