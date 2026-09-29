<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
const { data, error, refresh } = await useFetch('/api/passports');
usePageSeo({
  title: 'Passport ranking · Passport Unlock',
  description: () => {
    const leaders = data.value?.passports.filter(passport => passport.rank === 1) ?? [];
    const lead = leaders.length
      ? ` ${leaders.map(passport => passport.name).join(' and ')} ${leaders.length > 1 ? 'share first place' : 'ranks first'} with ${leaders[0]!.visaFree}.`
      : '';
    return `All 199 passports ranked by the number of destinations they can visit without a visa.${lead}`;
  },
});
const search = ref('');
const region = ref('All regions');
const filtered = computed(() =>
  (data.value?.passports ?? []).filter(passport => matchesCountry(passport, search.value, region.value))
);
const leader = computed(() => data.value?.passports[0]);
const topCount = computed(() => data.value?.passports.filter(passport => passport.rank === 1).length ?? 0);
const average = computed(() =>
  data.value?.passports.length
    ? Math.round(
        data.value.passports.reduce((sum, passport) => sum + passport.visaFree, 0) / data.value.passports.length
      )
    : 0
);
function resetFilters() {
  search.value = '';
  region.value = 'All regions';
}
</script>

<template>
  <div>
    <PageHeading
      eyebrow="03 / Ranking"
      title="Passport ranking"
      description="Passports ordered by the number of destinations they can visit without a visa."
      ><DataNote :date="data?.sourceDate"
    /></PageHeading>
    <div v-if="data && leader" class="mb-8 grid gap-4 sm:grid-cols-3">
      <div class="relative overflow-hidden rounded-2xl bg-emerald-900 p-6 text-white">
        <AppIcon name="ranking" :size="88" class="absolute top-6 right-4 text-emerald-700/40" />
        <p class="relative text-[10px] tracking-[0.14em] text-emerald-200 uppercase">Most visa-free destinations</p>
        <p class="relative mt-3 text-4xl font-medium tracking-tight">
          {{ leader.visaFree
          }}<span class="ml-2 text-xs font-normal tracking-normal text-emerald-100/70">destinations</span>
        </p>
        <p class="relative mt-4 flex items-center gap-2 text-xs">
          <CountryFlag :code="leader.code" :size="20" />{{ leader.name
          }}<span v-if="topCount > 1" class="text-emerald-200">+ {{ topCount - 1 }} tied</span>
        </p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-white p-6">
        <p class="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Passports ranked</p>
        <p class="mt-3 text-4xl font-medium tracking-tight">{{ data.passports.length }}</p>
        <p class="mt-4 text-xs text-stone-500">Africa, the Americas, Asia, Europe and Oceania</p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-[#eef0e5] p-6">
        <p class="text-[10px] tracking-[0.14em] text-stone-600 uppercase">Average</p>
        <p class="mt-3 text-4xl font-medium tracking-tight">
          {{ average }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-600">destinations</span>
        </p>
        <p class="mt-4 text-xs text-stone-600">Visa-free destinations per passport, rounded</p>
      </div>
    </div>
    <CountryFilters v-model:search="search" v-model:region="region" placeholder="Find a passport in the ranking…" />
    <div class="my-5 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
      <p>{{ filtered.length }} {{ filtered.length === 1 ? 'passport' : 'passports' }} · ranked globally</p>
      <p>Visa-free only · equal scores share a rank</p>
    </div>
    <EmptyState v-if="error" title="The ranking couldn’t load" description="Try loading the passport data again."
      ><button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">
        Try again
      </button></EmptyState
    >
    <EmptyState v-else-if="!filtered.length"
      ><button type="button" class="text-sm text-emerald-800 underline" @click="resetFilters">
        Clear filters
      </button></EmptyState
    >
    <div v-else class="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Global passport ranking by visa-free destinations. Regional and search filters preserve global ranks.
        </caption>
        <thead class="border-b border-stone-200 bg-stone-50 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
          <tr>
            <th scope="col" class="px-4 py-4 font-medium sm:px-6">Rank</th>
            <th scope="col" class="px-3 py-4 font-medium sm:px-6">Passport</th>
            <th scope="col" class="hidden px-6 py-4 font-medium md:table-cell">Region</th>
            <th scope="col" class="px-4 py-4 text-right font-medium sm:px-6">
              Visa-free<span class="hidden sm:inline"> destinations</span>
            </th>
            <th scope="col" class="hidden px-6 py-4 font-medium sm:table-cell">
              <span class="sr-only">Destinations</span>
            </th>
          </tr>
        </thead>
        <!-- 199 rows are costly to hydrate on page load, so they hydrate once they scroll into view. Interaction-based
             hydration isn't used: a quick tap could land before the rows' code arrives and bypass client-side navigation. -->
        <LazyRankingRows :passports="filtered" hydrate-on-visible />
      </table>
    </div>
    <p class="mt-5 max-w-3xl text-xs leading-6 text-stone-500">
      This ranking counts only visa-free destinations. Visas on arrival, eTAs, and eVisas are excluded, so these
      positions differ from broader passport mobility indexes.
      <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">Read the methodology.</NuxtLink>
    </p>
  </div>
</template>
