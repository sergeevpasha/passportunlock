<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: 'No matches found',
  description: 'Try another country name or change your filters.',
});
</script>

<template>
  <div class="rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center">
    <AppIcon name="search" :size="28" class="mx-auto mb-4 text-stone-400" />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p class="mt-2 text-sm text-stone-500">{{ description }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
