<script setup lang="ts">
import { byRank, matchesCountry, rankOf, scoreOf, scores } from '#shared/catalogue';
import { allCountries, countryGroupIds } from '#shared/countries';
const { data, error, refresh } = await useFetch('/api/passports');
usePageSeo({
  title: 'Passport ranking · Passport Unlock',
  description: () => {
    const leaders = data.value?.passports.filter(passport => passport.rank === 1) ?? [];
    const lead = leaders.length
      ? ` ${leaders.map(passport => passport.name).join(' and ')} ${leaders.length > 1 ? 'share first place' : 'ranks first'} with ${leaders[0]!.visaFree}.`
      : '';
    return `All 199 passports ranked by the number of destinations they can visit without a visa, or by mobility score.${lead}`;
  },
});
const search = ref('');
const group = useQueryFilter('group', countryGroupIds, allCountries);
const score = useQueryFilter('score', scores, 'visa-free');
const ranked = computed(() => [...(data.value?.passports ?? [])].sort(byRank(score.value)));
const rows = computed(() =>
  ranked.value
    .filter(passport => matchesCountry(passport, search.value, group.value))
    .map(passport => ({
      ...passport,
      rank: rankOf(passport, score.value),
      score: scoreOf(passport, score.value),
      href: `/compare?p1=${passport.code.toLowerCase()}`,
      linkLabel: `View ${passport.name} destinations`,
    }))
);
const leader = computed(() => ranked.value[0]);
const topCount = computed(() => ranked.value.filter(passport => rankOf(passport, score.value) === 1).length);
const average = computed(() =>
  ranked.value.length
    ? Math.round(ranked.value.reduce((sum, passport) => sum + scoreOf(passport, score.value), 0) / ranked.value.length)
    : 0
);
function resetFilters() {
  search.value = '';
  group.value = allCountries;
}
</script>

<template>
  <div>
    <PageHeading
      eyebrow="04 / Ranking"
      title="Passport ranking"
      description="Passports ordered by the number of destinations they can visit without a visa, or by mobility score."
      ><DataNote :date="data?.sourceDate"
    /></PageHeading>
    <div v-if="data && leader" class="mb-8 grid gap-4 sm:grid-cols-3">
      <div class="relative overflow-hidden rounded-2xl bg-emerald-900 p-6 text-white">
        <AppIcon name="ranking" :size="88" class="absolute top-6 right-4 text-emerald-700/40" />
        <p class="relative text-[10px] tracking-[0.14em] text-emerald-200 uppercase">
          {{ score === 'mobility' ? 'Highest mobility score' : 'Most visa-free destinations' }}
        </p>
        <p class="relative mt-3 text-4xl font-medium tracking-tight">
          {{ scoreOf(leader, score)
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
        <p class="mt-4 text-xs text-stone-600">
          {{ score === 'mobility' ? 'Mobility score' : 'Visa-free destinations' }} per passport, rounded
        </p>
      </div>
    </div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <ScoreToggle v-model="score" />
      <p class="text-xs text-stone-500">
        {{
          score === 'mobility'
            ? 'Counts visa-free destinations, visas on arrival and eTAs.'
            : 'Counts only destinations that need no approval before travel.'
        }}
      </p>
    </div>
    <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a passport in the ranking…" />
    <div class="my-5 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
      <p>{{ rows.length }} {{ rows.length === 1 ? 'passport' : 'passports' }} · ranked globally</p>
      <p>Equal scores share a rank</p>
    </div>
    <EmptyState v-if="error" title="The ranking couldn’t load" description="Try loading the passport data again."
      ><button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">
        Try again
      </button></EmptyState
    >
    <EmptyState v-else-if="!rows.length"
      ><button type="button" class="text-sm text-emerald-800 underline" @click="resetFilters">
        Clear filters
      </button></EmptyState
    >
    <div v-else class="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Global passport ranking by
          {{
            score === 'mobility' ? 'mobility score' : 'visa-free destinations'
          }}. Regional and search filters preserve global ranks.
        </caption>
        <thead class="border-b border-stone-200 bg-stone-50 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
          <tr>
            <th scope="col" class="px-4 py-4 font-medium sm:px-6">Rank</th>
            <th scope="col" class="px-3 py-4 font-medium sm:px-6">Passport</th>
            <th scope="col" class="hidden px-6 py-4 font-medium md:table-cell">Region</th>
            <th scope="col" class="px-4 py-4 text-right font-medium sm:px-6">
              <template v-if="score === 'mobility'">Mobility<span class="hidden sm:inline"> score</span></template
              ><template v-else>Visa-free<span class="hidden sm:inline"> destinations</span></template>
            </th>
            <th scope="col" class="hidden px-6 py-4 font-medium sm:table-cell">
              <span class="sr-only">Destinations</span>
            </th>
          </tr>
        </thead>
        <!-- 199 rows are costly to hydrate on page load, so they hydrate once they scroll into view. Interaction-based
             hydration isn't used: a quick tap could land before the rows' code arrives and bypass client-side navigation. -->
        <LazyRankingRows :rows="rows" hydrate-on-visible />
      </table>
    </div>
    <p class="mt-5 max-w-3xl text-xs leading-6 text-stone-500">
      The visa-free ranking counts only destinations that need no visa or approval before travel. The mobility score
      also counts visas on arrival and eTAs, as broader passport indexes do; eVisas count in neither.
      <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">Read the methodology.</NuxtLink>
    </p>
  </div>
</template>
