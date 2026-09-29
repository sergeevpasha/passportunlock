<script setup lang="ts">
import { matchesCountry, type PassportSummary } from '#shared/catalogue';
import { maxPassports } from '#shared/comparison-query';
import { joinNames } from '~/utils/entry';
const { data, error, refresh } = await useFetch('/api/passports');
const passports = computed(() => data.value?.passports ?? []);
const leaders = computed(() => passports.value.filter(passport => passport.rank === 1));
const fewest = computed(() => {
  const lowest = Math.min(...passports.value.map(passport => passport.visaFree));
  return passports.value.filter(passport => passport.visaFree === lowest);
});
const average = computed(() =>
  passports.value.length
    ? Math.round(passports.value.reduce((sum, passport) => sum + passport.visaFree, 0) / passports.value.length)
    : 0
);
usePageSeo({
  title: 'Passport ranking · Passport Unlock',
  description: () => {
    const lead = leaders.value.length
      ? ` ${joinNames(leaders.value.map(passport => passport.name))} ${leaders.value.length > 1 ? 'share first place' : 'ranks first'} with ${leaders.value[0]!.visaFree}.`
      : '';
    return `All 199 passports ranked by the number of destinations they can visit without a visa.${lead} Select up to three to compare.`;
  },
});
const { selected, message, comparisonLink, toggle, clear } = usePassportSelection();
const search = ref('');
const region = ref('All regions');
const sort = ref<'rank' | 'name'>('rank');
const filtered = computed(() =>
  passports.value
    .filter(passport => matchesCountry(passport, search.value, region.value))
    .sort((a, b) =>
      sort.value === 'rank' ? a.rank - b.rank || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)
    )
);
const selectedPassports = computed(() =>
  selected.value.flatMap(code => passports.value.find(passport => passport.code === code) ?? [])
);
/** Two names, or the first two and how many more share the place. */
function names(list: PassportSummary[]) {
  return list.length > 2
    ? `${list[0]!.name}, ${list[1]!.name} and ${list.length - 2} more`
    : joinNames(list.map(passport => passport.name));
}
// A checkbox ticks itself before the handler runs, so undo that when a fourth passport is refused.
function onCompareChange(event: Event, code: string) {
  toggle(code);
  (event.target as HTMLInputElement).checked = selected.value.includes(code);
}
function resetFilters() {
  search.value = '';
  region.value = 'All regions';
}
</script>

<template>
  <div :class="selected.length ? 'pb-36' : ''">
    <PageHeading
      eyebrow="Ranking"
      title="All passports"
      description="Every passport ranked by the number of destinations it can visit without a visa. Select up to three to compare them."
      ><DataNote :date="data?.sourceDate"
    /></PageHeading>
    <div v-if="passports.length" class="mb-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
      <div class="rounded-2xl bg-emerald-900 p-5 text-white sm:p-6">
        <p class="eyebrow text-emerald-200">Most visa-free</p>
        <p class="mt-2 text-3xl font-medium tracking-tight sm:mt-3 sm:text-4xl">
          {{ leaders[0]!.visaFree
          }}<span class="ml-2 text-sm font-normal tracking-normal text-emerald-100">destinations</span>
        </p>
        <p class="mt-3 flex flex-wrap items-center gap-2 text-sm sm:mt-4">
          <span class="flex -space-x-1.5"
            ><CountryFlag
              v-for="passport in leaders.slice(0, 3)"
              :key="passport.code"
              :code="passport.code"
              :size="20"
              class="ring-2 ring-emerald-900" /></span
          >{{ names(leaders) }}
        </p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <p class="eyebrow text-stone-600">Average</p>
        <p class="mt-2 text-3xl font-medium tracking-tight sm:mt-3 sm:text-4xl">
          {{ average }}<span class="ml-2 text-sm font-normal tracking-normal text-stone-600">destinations</span>
        </p>
        <p class="mt-3 text-sm text-stone-600 sm:mt-4">Visa-free, per passport</p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-panel p-5 sm:p-6">
        <p class="eyebrow text-stone-700">Fewest visa-free</p>
        <p class="mt-2 text-3xl font-medium tracking-tight sm:mt-3 sm:text-4xl">
          {{ fewest[0]!.visaFree
          }}<span class="ml-2 text-sm font-normal tracking-normal text-stone-700">{{
            fewest[0]!.visaFree === 1 ? 'destination' : 'destinations'
          }}</span>
        </p>
        <p class="mt-3 flex flex-wrap items-center gap-2 text-sm sm:mt-4 text-stone-700">
          <span class="flex -space-x-1.5"
            ><CountryFlag
              v-for="passport in fewest.slice(0, 3)"
              :key="passport.code"
              :code="passport.code"
              :size="20"
              class="ring-2 ring-panel" /></span
          >{{ names(fewest) }}
        </p>
      </div>
    </div>
    <CountryFilters v-model:search="search" v-model:region="region" placeholder="Find a passport…">
      <SelectMenu
        v-model="sort"
        :options="[
          { value: 'rank', label: 'Highest ranked' },
          { value: 'name', label: 'Country A–Z' },
        ]"
        label="Sort passports"
        class="sm:w-48"
      />
    </CountryFilters>
    <div class="my-5 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
      <p>
        {{ filtered.length }} {{ filtered.length === 1 ? 'passport' : 'passports' }}
        <span v-if="search || region !== 'All regions'">match your filters</span>
      </p>
      <p>Visa-free only · equal scores share a rank</p>
    </div>
    <EmptyState
      v-if="error"
      icon="info"
      title="Passports couldn’t load"
      description="Check your connection and try again."
      ><button
        type="button"
        class="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        @click="refresh()"
      >
        Try again
      </button></EmptyState
    >
    <EmptyState v-else-if="!filtered.length"
      ><button
        type="button"
        class="text-sm font-medium text-emerald-800 underline underline-offset-4"
        @click="resetFilters"
      >
        Clear filters
      </button></EmptyState
    >
    <!-- overflow-clip rounds the corners without becoming a scroll container, so the header sticks to the page. -->
    <div v-else class="overflow-clip rounded-2xl border border-stone-200 bg-white">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Passports by visa-free destinations. Search and region filters keep the global rank.
        </caption>
        <thead class="text-stone-600">
          <tr
            class="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-stone-50 [&>th]:py-3 [&>th]:shadow-[inset_0_-1px_0] [&>th]:shadow-stone-200"
          >
            <th scope="col" class="w-12 px-2 sm:w-20 sm:px-6"><span class="eyebrow">Rank</span></th>
            <th scope="col" class="px-2 sm:px-4"><span class="eyebrow">Passport</span></th>
            <th scope="col" class="hidden px-4 md:table-cell"><span class="eyebrow">Region</span></th>
            <th scope="col" class="px-2 text-right sm:px-4">
              <span class="eyebrow max-sm:tracking-normal">Visa-free</span>
            </th>
            <th scope="col" class="w-10 px-2 text-center sm:w-24 sm:px-6">
              <span class="eyebrow max-sm:sr-only">Compare</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr
            v-for="passport in filtered"
            :key="passport.code"
            :class="selected.includes(passport.code) ? 'bg-emerald-50/60' : 'hover:bg-stone-50'"
          >
            <td class="px-2 py-3 sm:px-6">
              <span
                class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-medium tabular-nums"
                :class="passport.rank <= 3 ? 'bg-lime-100 text-emerald-900' : 'text-stone-600'"
                >{{ passport.rank }}</span
              >
            </td>
            <th scope="row" class="px-2 py-3 font-medium sm:px-4">
              <NuxtLink
                :to="{ path: '/compare', query: { p1: passport.code.toLowerCase() } }"
                class="inline-flex items-center gap-2.5 rounded-md hover:text-emerald-700 hover:underline hover:underline-offset-4 sm:gap-3"
                ><CountryFlag :code="passport.code" :size="24" /><span class="min-w-0 wrap-anywhere">{{
                  passport.name
                }}</span></NuxtLink
              >
            </th>
            <td class="hidden px-4 py-3 text-stone-600 md:table-cell">{{ passport.region }}</td>
            <td class="px-2 py-3 sm:px-4">
              <div class="flex items-center justify-end gap-4">
                <svg
                  viewBox="0 0 100 4"
                  aria-hidden="true"
                  class="hidden h-1.5 w-28 overflow-hidden rounded-full lg:block"
                >
                  <rect width="100" height="4" class="fill-stone-100" />
                  <rect :width="(passport.visaFree / passport.total) * 100" height="4" class="fill-emerald-700" /></svg
                ><span class="w-9 text-right font-semibold tabular-nums">{{ passport.visaFree }}</span>
              </div>
            </td>
            <td class="px-2 py-3 text-center sm:px-6">
              <input
                type="checkbox"
                :checked="selected.includes(passport.code)"
                :aria-label="`Compare ${passport.name}`"
                class="h-5 w-5 accent-emerald-700"
                @change="onCompareChange($event, passport.code)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-5 max-w-3xl text-xs leading-6 text-stone-600">
      This ranking counts only visa-free destinations. Visas on arrival, eTAs and eVisas are excluded, so these
      positions differ from broader passport mobility indexes.
      <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">How passports are scored.</NuxtLink>
    </p>
    <div
      v-if="selected.length"
      class="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-3xl rounded-2xl border border-emerald-800 bg-emerald-950 p-4 text-white shadow-2xl sm:inset-x-8 sm:p-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-emerald-100">{{ selected.length }} / {{ maxPassports }}</span
          ><button
            v-for="passport in selectedPassports"
            :key="passport.code"
            type="button"
            :aria-label="`Remove ${passport.name}`"
            class="flex items-center gap-2 rounded-full bg-white/10 p-1.5 pr-2.5 text-sm hover:bg-white/20"
            @click="toggle(passport.code)"
          >
            <CountryFlag :code="passport.code" :size="22" /><span class="hidden sm:inline">{{ passport.name }}</span
            ><AppIcon name="close" :size="13" /></button
          ><button type="button" class="text-sm text-emerald-100 underline underline-offset-4" @click="clear">
            Clear
          </button>
        </div>
        <NuxtLink
          :to="comparisonLink"
          class="inline-flex items-center gap-3 rounded-lg bg-lime-200 px-5 py-3 text-sm font-semibold text-emerald-950"
          >Compare selection<AppIcon name="arrow" :size="17"
        /></NuxtLink>
      </div>
      <p role="status" class="text-sm text-amber-200" :class="message && 'mt-3'">{{ message }}</p>
    </div>
  </div>
</template>
