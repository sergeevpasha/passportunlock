<script setup lang="ts">
import type { EntryRule } from '#shared/passports';
import { dateLabel } from '~/utils/entry';
defineProps<{
  rows: { code: string; name: string; region: string; rules: EntryRule[] }[];
  columns: { code: string; name: string; snapshot: { sourceDate: string } }[];
}>();
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
    <table class="w-full text-left text-sm">
      <caption class="sr-only">
        Entry requirements by destination and passport. Each column shows the date of its data.
      </caption>
      <thead class="border-b border-stone-200 bg-stone-50">
        <tr>
          <th scope="col" class="min-w-44 px-5 py-4 text-[10px] font-medium tracking-wider text-stone-500 uppercase">
            Destination
          </th>
          <th v-for="(column, index) in columns" :key="index" scope="col" class="min-w-48 px-5 py-4 font-medium">
            <div class="flex items-center gap-2">
              <CountryFlag :code="column.code" :size="19" /><span class="text-xs">{{ column.name }}</span>
            </div>
            <span class="mt-1.5 block text-[10px] font-normal text-stone-500">{{
              dateLabel(column.snapshot.sourceDate)
            }}</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-stone-100">
        <tr v-for="row in rows" :key="row.code" class="hover:bg-stone-50/70">
          <th scope="row" class="px-5 py-4 font-medium">
            <div class="flex items-center gap-3">
              <CountryFlag :code="row.code" :size="24" /><span class="text-xs">{{ row.name }}</span>
            </div>
          </th>
          <td v-for="(rule, index) in row.rules" :key="index" class="px-5 py-3">
            <EntryStatus :rule="rule" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
