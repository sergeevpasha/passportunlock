<script setup lang="ts">
import { iconPaths } from '~/utils/icons';
import { followLink } from '~/utils/links';
const props = defineProps<{
  rows: {
    code: string;
    code3: string;
    name: string;
    region: string;
    rank: number;
    score: number;
    total: number;
    href: string;
    /** Names the arrow link, whose text is only an icon. */
    linkLabel: string;
  }[];
}>();

// Plain links and images keep the 199 rows free of component instances, which makes them cheap to hydrate.
onNuxtReady(() => {
  if (props.rows[0]) preloadRouteComponents(props.rows[0].href);
});
</script>

<template>
  <tbody class="divide-y divide-stone-100" @click="followLink">
    <tr v-for="row in rows" :key="row.code" class="group hover:bg-emerald-50/40">
      <td class="px-4 py-4 sm:px-6">
        <span
          class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg font-mono text-xs"
          :class="row.rank <= 3 ? 'bg-lime-100 text-emerald-900' : 'text-stone-500'"
          >{{ String(row.rank).padStart(2, '0') }}</span
        >
      </td>
      <th scope="row" class="px-3 py-4 font-medium sm:px-6">
        <a :href="row.href" class="flex items-center gap-3 hover:text-emerald-700"
          ><img
            :src="`/flags/1x1/${row.code.toLowerCase()}.svg`"
            alt=""
            width="28"
            height="28"
            loading="lazy"
            decoding="async"
            class="inline-block shrink-0 rounded-full bg-stone-100 object-cover ring-1 ring-black/5"
          /><span>{{ row.name }}</span
          ><span class="hidden text-[10px] font-normal text-stone-500 lg:inline">{{ row.code3 }}</span></a
        >
      </th>
      <td class="hidden px-6 py-4 text-xs text-stone-500 md:table-cell">{{ row.region }}</td>
      <td class="px-4 py-4 sm:px-6">
        <div class="flex items-center justify-end gap-5">
          <svg viewBox="0 0 100 4" aria-hidden="true" class="hidden h-1.5 w-28 overflow-hidden rounded-full lg:block">
            <rect width="100" height="4" class="fill-stone-100" />
            <rect :width="(row.score / row.total) * 100" height="4" class="fill-emerald-700" /></svg
          ><span class="w-8 text-right font-semibold tabular-nums">{{ row.score }}</span>
        </div>
      </td>
      <td class="hidden px-6 py-4 text-right sm:table-cell">
        <a
          :href="row.href"
          :aria-label="row.linkLabel"
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
