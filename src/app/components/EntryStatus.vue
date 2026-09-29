<script setup lang="ts">
import { entryLabels, type EntryRule, type EntryType } from '#shared/passports';
import { entryShortLabels } from '~/utils/entry';
defineProps<{
  rule: EntryRule;
  /** The easiest way in among the passports being compared. */
  easiest?: boolean;
  /** The easiest because its stay is the longest. */
  longestStay?: boolean;
  /** Use the short label on phones, where a comparison column is narrow. */
  compact?: boolean;
}>();
const classes: Record<EntryType, string> = {
  'visa free': 'bg-emerald-50 text-emerald-800',
  'visa on arrival': 'bg-blue-50 text-blue-800',
  eta: 'bg-violet-50 text-violet-800',
  'e-visa': 'bg-orange-50 text-orange-800',
  'visa required': 'bg-stone-100 text-stone-700',
  'no admission': 'bg-red-50 text-red-800',
  domestic: 'bg-emerald-900 text-white',
  unknown: 'bg-stone-100 text-stone-600',
};
</script>

<template>
  <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
    <span
      class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm leading-5 font-medium sm:px-2.5 sm:whitespace-nowrap"
      :class="classes[rule.status]"
      ><AppIcon
        v-if="rule.status === 'visa free'"
        name="check"
        :size="14"
        :class="compact && 'hidden sm:block'"
      /><template v-if="compact"
        ><span class="sm:hidden">{{ entryShortLabels[rule.status] }}</span
        ><span class="hidden sm:inline">{{ entryLabels[rule.status] }}</span></template
      ><template v-else>{{ entryLabels[rule.status] }}</template></span
    ><span
      v-if="rule.days"
      class="text-sm whitespace-nowrap"
      :class="longestStay ? 'font-semibold text-emerald-800' : 'text-stone-600'"
      >{{ rule.days }} days</span
    ><span v-if="easiest" class="sr-only">(easiest)</span>
  </span>
</template>
