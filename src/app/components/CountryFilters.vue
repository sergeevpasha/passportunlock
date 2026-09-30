<script setup lang="ts">
import { allCountries, countryGroups } from '#shared/countries';
withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Search by country or code…' });
const search = defineModel<string>('search', { required: true });
const group = defineModel<string>('group', { required: true });
const id = useId();
const groups = [
  { value: allCountries, label: 'All countries' },
  ...countryGroups.map(item => ({ value: item.id, label: item.label, group: item.kind })),
];
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
    <SelectMenu v-model="group" :options="groups" label="Filter by region or group" class="sm:w-56" />
    <slot />
  </div>
</template>
