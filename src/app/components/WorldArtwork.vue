<script setup lang="ts">
import { worldCountries } from '~/utils/world-map';
</script>

<template>
  <svg viewBox="0 0 1000 520" aria-hidden="true" class="h-full w-full">
    <path
      v-for="country in worldCountries"
      :key="country.id"
      :d="country.path"
      class="fill-land stroke-canvas stroke-[0.7]"
    />
  </svg>
</template>
