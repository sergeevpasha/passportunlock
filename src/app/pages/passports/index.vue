<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import { maxPassports } from '#shared/comparison-query';
import { allCountries, countryGroupIds } from '#shared/countries';
usePageSeo({
  title: 'All passports · Passport Unlock',
  description:
    'All 199 passports with the number of destinations each can visit without a visa and its global rank. Select up to three to compare.',
});
const { data, error, refresh } = await useFetch('/api/passports');
const { selected, message, comparisonLink, toggle, clear } = usePassportSelection();
const search = ref('');
const group = useQueryFilter('group', countryGroupIds, allCountries);
const sort = ref('name');
const visibleCount = ref(24);
const filtered = computed(() =>
  [...(data.value?.passports ?? [])]
    .filter(passport => matchesCountry(passport, search.value, group.value))
    .sort((a, b) =>
      sort.value === 'rank' ? a.rank - b.rank || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)
    )
);
const visible = computed(() => filtered.value.slice(0, visibleCount.value));
const selectedPassports = computed(() =>
  selected.value.flatMap(code => data.value?.passports.find(passport => passport.code === code) ?? [])
);
watch([search, group, sort], () => {
  visibleCount.value = 24;
});
function resetFilters() {
  search.value = '';
  group.value = allCountries;
}
</script>

<template>
  <div :class="selected.length ? 'pb-32' : ''">
    <PageHeading
      eyebrow="01 / Passports"
      title="All passports"
      description="Each passport with the number of destinations it can visit without a visa, and its rank. Select up to three to compare."
      ><div class="flex flex-col items-start gap-3 sm:items-end">
        <NuxtLink
          to="/passports/covers"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium hover:border-emerald-700"
          ><AppIcon name="passport" :size="16" />See all passport covers</NuxtLink
        >
        <DataNote :date="data?.sourceDate" /></div
    ></PageHeading>
    <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a passport…">
      <SelectMenu
        v-model="sort"
        :options="[
          { value: 'name', label: 'Country A–Z' },
          { value: 'rank', label: 'Highest ranked' },
        ]"
        label="Sort passports"
        class="sm:w-48"
      />
    </CountryFilters>
    <div class="my-5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
      <p>
        {{ filtered.length }} {{ filtered.length === 1 ? 'passport' : 'passports' }}
        <span v-if="search || group !== allCountries">match your filters</span>
      </p>
      <p>Select up to three with <span class="font-semibold text-emerald-800">+</span> to compare them</p>
    </div>
    <p role="status" class="mb-3 text-sm text-amber-800">{{ message }}</p>
    <EmptyState
      v-if="error"
      title="Passports couldn’t load"
      description="Please try loading the passport directory again."
      ><button type="button" class="rounded-lg bg-emerald-900 px-4 py-2 text-sm text-white" @click="refresh()">
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
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <PassportCard
        v-for="passport in visible"
        :key="passport.code"
        :passport="passport"
        :selected="selected.includes(passport.code)"
        @toggle="toggle"
      />
    </div>
    <div v-if="visible.length < filtered.length" class="mt-9 text-center">
      <button
        type="button"
        class="rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-medium hover:border-emerald-800"
        @click="visibleCount += 24"
      >
        Show more passports <span class="ml-2 text-stone-500">{{ visible.length }} / {{ filtered.length }}</span>
      </button>
    </div>
    <div
      v-if="selected.length"
      class="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-3xl rounded-2xl border border-emerald-800 bg-emerald-950 p-4 text-white shadow-2xl sm:inset-x-8 sm:p-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs text-emerald-200">{{ selected.length }} / {{ maxPassports }}</span
          ><button
            v-for="passport in selectedPassports"
            :key="passport.code"
            type="button"
            :aria-label="`Remove ${passport.name}`"
            class="flex items-center gap-2 rounded-full bg-white/10 p-1.5 pr-2.5 text-xs hover:bg-white/20"
            @click="toggle(passport.code)"
          >
            <CountryFlag :code="passport.code" :size="22" /><span class="hidden sm:inline">{{ passport.name }}</span
            ><AppIcon name="close" :size="13" /></button
          ><button type="button" class="text-xs text-emerald-200 underline underline-offset-4" @click="clear">
            Clear
          </button>
        </div>
        <NuxtLink
          :to="comparisonLink"
          class="inline-flex items-center gap-3 rounded-lg bg-lime-200 px-5 py-3 text-xs font-semibold text-emerald-950"
          >Compare selection<AppIcon name="arrow" :size="17"
        /></NuxtLink>
      </div>
      <p v-if="message" class="mt-3 text-xs text-amber-200">{{ message }}</p>
    </div>
  </div>
</template>
