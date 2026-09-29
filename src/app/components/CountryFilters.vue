<script setup lang="ts">
import { regionGroups } from '#shared/countries';
withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Search by country or code…' });
const search = defineModel<string>('search', { required: true });
const region = defineModel<string>('region', { required: true });
const id = useId();
const regions = ['All regions', ...Object.keys(regionGroups)].map(name => ({ value: name, label: name }));
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row">
    <div class="relative flex-1">
      <AppIcon name="search" :size="18" class="pointer-events-none absolute top-3.5 left-4 text-stone-400" />
      <label :for="`${id}-search`" class="sr-only">{{ placeholder }}</label>
      <input
        :id="`${id}-search`"
        v-model="search"
        type="search"
        :placeholder="placeholder"
        class="h-12 w-full rounded-xl border border-stone-200 bg-white pr-4 pl-11 text-sm placeholder:text-stone-400"
      />
    </div>
    <SelectMenu v-model="region" :options="regions" label="Filter by region" class="sm:w-48" />
    <slot />
  </div>
</template>
