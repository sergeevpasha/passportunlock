<script setup lang="ts">
import { entryLabels, type EntryRule, type EntryType } from '#shared/passports';
defineProps<{ rule: EntryRule }>();
const classes: Record<EntryType, string> = {
  'visa free': 'bg-emerald-50 text-emerald-800',
  'visa on arrival': 'bg-blue-50 text-blue-800',
  eta: 'bg-violet-50 text-violet-800',
  'e-visa': 'bg-orange-50 text-orange-800',
  'visa required': 'bg-stone-100 text-stone-600',
  'no admission': 'bg-red-50 text-red-800',
  domestic: 'bg-emerald-900 text-white',
  unknown: 'bg-stone-100 text-stone-600',
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap"
      :class="classes[rule.status]"
      ><AppIcon v-if="rule.status === 'visa free'" name="check" :size="12" />{{ entryLabels[rule.status] }}</span
    ><span v-if="rule.days" class="text-[10px] whitespace-nowrap text-stone-500">{{ rule.days }} days</span>
  </div>
</template>
