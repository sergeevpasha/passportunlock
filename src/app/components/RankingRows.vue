<script setup lang="ts">
import type { PassportSummary } from '#shared/catalogue';
import { iconPaths } from '~/utils/icons';
defineProps<{ passports: PassportSummary[] }>();

// Plain links and images keep the 199 rows free of component instances, which makes them cheap to hydrate.
// One listener keeps unmodified left clicks in the app; other clicks behave like any link.
function navigate(event: MouseEvent) {
  const link = (event.target as Element).closest('a');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateTo(link.getAttribute('href')!);
}
onNuxtReady(() => preloadRouteComponents('/compare'));
</script>

<template>
  <tbody class="divide-y divide-stone-100" @click="navigate">
    <tr v-for="passport in passports" :key="passport.code" class="group hover:bg-emerald-50/40">
      <td class="px-4 py-4 sm:px-6">
        <span
          class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg font-mono text-xs"
          :class="passport.rank <= 3 ? 'bg-lime-100 text-emerald-900' : 'text-stone-500'"
          >{{ String(passport.rank).padStart(2, '0') }}</span
        >
      </td>
      <th scope="row" class="px-3 py-4 font-medium sm:px-6">
        <a :href="`/compare?p1=${passport.code.toLowerCase()}`" class="flex items-center gap-3 hover:text-emerald-700"
          ><img
            :src="`/flags/1x1/${passport.code.toLowerCase()}.svg`"
            alt=""
            width="28"
            height="28"
            loading="lazy"
            decoding="async"
            class="inline-block shrink-0 rounded-full bg-stone-100 object-cover ring-1 ring-black/5"
          /><span>{{ passport.name }}</span
          ><span class="hidden text-[10px] font-normal text-stone-500 lg:inline">{{ passport.code3 }}</span></a
        >
      </th>
      <td class="hidden px-6 py-4 text-xs text-stone-500 md:table-cell">{{ passport.region }}</td>
      <td class="px-4 py-4 sm:px-6">
        <div class="flex items-center justify-end gap-5">
          <svg viewBox="0 0 100 4" aria-hidden="true" class="hidden h-1.5 w-28 overflow-hidden rounded-full lg:block">
            <rect width="100" height="4" class="fill-stone-100" />
            <rect :width="(passport.visaFree / passport.total) * 100" height="4" class="fill-emerald-700" /></svg
          ><span class="w-8 text-right font-semibold tabular-nums">{{ passport.visaFree }}</span>
        </div>
      </td>
      <td class="hidden px-6 py-4 text-right sm:table-cell">
        <a
          :href="`/compare?p1=${passport.code.toLowerCase()}`"
          :aria-label="`View ${passport.name} destinations`"
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
