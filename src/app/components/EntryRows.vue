<script setup lang="ts">
import { entryLabels, type EntryRule } from '#shared/passports';
import { entryClasses } from '~/utils/entry';
import { iconPaths } from '~/utils/icons';
import { followLink } from '~/utils/links';
const props = defineProps<{
  rows: { code: string; code3: string; name: string; region: string; rule: EntryRule; href: string }[];
  /** The destination, which names each row's link. */
  destination: string;
}>();

// Like the ranking rows, these are plain links and images rather than components, so they are cheap to hydrate.
onNuxtReady(() => {
  if (props.rows[0]) preloadRouteComponents(props.rows[0].href);
});
</script>

<template>
  <tbody class="divide-y divide-stone-100" @click="followLink">
    <tr v-for="row in rows" :key="row.code" class="group hover:bg-emerald-50/40">
      <th scope="row" class="px-4 py-3.5 font-medium sm:px-6">
        <a :href="row.href" class="flex items-center gap-3 hover:text-emerald-700"
          ><img
            :src="`/flags/1x1/${row.code.toLowerCase()}.svg`"
            alt=""
            width="24"
            height="24"
            loading="lazy"
            decoding="async"
            class="inline-block shrink-0 rounded-full bg-stone-100 object-cover ring-1 ring-black/5"
          /><span class="text-xs sm:text-sm">{{ row.name }}</span
          ><span class="hidden text-[10px] font-normal text-stone-500 lg:inline">{{ row.code3 }}</span></a
        >
      </th>
      <td class="hidden px-6 py-3.5 text-xs text-stone-500 md:table-cell">{{ row.region }}</td>
      <td class="px-4 py-3 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap"
            :class="entryClasses[row.rule.status]"
            ><svg
              v-if="row.rule.status === 'visa free'"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="shrink-0"
            >
              <path :d="iconPaths.check" /></svg
            >{{ entryLabels[row.rule.status] }}</span
          ><span v-if="row.rule.days" class="text-[10px] whitespace-nowrap text-stone-500"
            >{{ row.rule.days }} days</span
          >
        </div>
      </td>
      <td class="hidden px-6 py-3 text-right sm:table-cell">
        <a
          :href="row.href"
          :aria-label="`${row.name} passport holders visiting ${destination}`"
          class="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 group-hover:bg-emerald-100 group-hover:text-emerald-800"
          ><svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="shrink-0"
          >
            <path :d="iconPaths.diagonal" /></svg
        ></a>
      </td>
    </tr>
  </tbody>
</template>
