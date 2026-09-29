<script setup lang="ts">
import type { IconName } from '~/utils/icons';
withDefaults(defineProps<{ title?: string; description?: string; icon?: IconName }>(), {
  title: 'No matches found',
  description: 'Try another country name or change your filters.',
  icon: 'search',
});
</script>

<template>
  <div class="rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center">
    <AppIcon :name="icon" :size="28" class="mx-auto mb-4 text-stone-500" />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p class="mt-2 text-sm text-stone-600">{{ description }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
