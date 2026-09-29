<script setup lang="ts">
import { worldCountries } from '~/utils/world-map';
withDefaults(defineProps<{ dark?: boolean }>(), { dark: false });
</script>

<template>
  <svg viewBox="0 0 1000 520" aria-hidden="true" class="h-full w-full">
    <path
      v-for="country in worldCountries"
      :key="country.id"
      :d="country.path"
      class="stroke-[0.7]"
      :class="dark ? 'fill-emerald-700/35 stroke-emerald-900/30' : 'fill-[#d6dfce] stroke-[#f8f9f5]'"
    />
  </svg>
</template>
