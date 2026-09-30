<script setup lang="ts">
import { entryLabels, type EntryRule } from '#shared/passports';
import { entryClasses } from '~/utils/entry';
defineProps<{ rule: EntryRule }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap"
      :class="entryClasses[rule.status]"
      ><AppIcon v-if="rule.status === 'visa free'" name="check" :size="12" />{{ entryLabels[rule.status] }}</span
    ><span v-if="rule.days" class="text-[10px] whitespace-nowrap text-stone-500">{{ rule.days }} days</span>
  </div>
</template>
