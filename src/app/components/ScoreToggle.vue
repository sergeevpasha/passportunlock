<script setup lang="ts">
import type { Score } from '#shared/catalogue';
const score = defineModel<Score>({ required: true });
const options: { value: Score; label: string }[] = [
  { value: 'visa-free', label: 'Visa-free' },
  { value: 'mobility', label: 'Mobility score' },
];
</script>

<template>
  <div role="group" aria-label="Rank by" class="inline-flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="score === option.value"
      class="min-h-9 rounded-lg px-3.5 text-xs font-medium transition-colors motion-reduce:transition-none"
      :class="score === option.value ? 'bg-emerald-900 text-white' : 'text-stone-500 hover:text-emerald-900'"
      @click="score = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
