<script setup lang="ts">
import { byRank, matchesCountry, rankOf, scoreOf, scores } from '#shared/catalogue';
import { allCountries, countryGroupIds } from '#shared/countries';
import { destinationPath } from '#shared/country-paths';
const { data, error, refresh } = await useFetch('/api/destinations');
usePageSeo({
  title: 'All destinations, ranked by visa-free access · Passport Unlock',
  description: () => {
    const leaders = data.value?.destinations.filter(destination => destination.rank === 1) ?? [];
    const lead = leaders.length
      ? ` ${leaders.map(destination => destination.name).join(' and ')} ${leaders.length > 1 ? 'admit' : 'admits'} ${leaders[0]!.visaFree} of ${leaders[0]!.total}.`
      : '';
    return `All 199 destinations ranked by how many passports can visit without a visa, with the rule for every passport.${lead}`;
  },
});
const search = ref('');
const group = useQueryFilter('group', countryGroupIds, allCountries);
const score = useQueryFilter('score', scores, 'visa-free');
const ranked = computed(() => [...(data.value?.destinations ?? [])].sort(byRank(score.value)));
const rows = computed(() =>
  ranked.value
    .filter(destination => matchesCountry(destination, search.value, group.value))
    .map(destination => ({
      ...destination,
      rank: rankOf(destination, score.value),
      score: scoreOf(destination, score.value),
      href: destinationPath(destination.code),
      linkLabel: `Every passport’s rule for ${destination.name}`,
    }))
);
const leader = computed(() => ranked.value[0]);
const topCount = computed(() => ranked.value.filter(destination => rankOf(destination, score.value) === 1).length);
const average = computed(() =>
  ranked.value.length
    ? Math.round(
        ranked.value.reduce((sum, destination) => sum + scoreOf(destination, score.value), 0) / ranked.value.length
      )
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
      eyebrow="02 / Destinations"
      title="All destinations"
      description="Destinations ordered by how many passports they let in without a visa. Open one to see the rule for every passport."
      ><DataNote :date="data?.sourceDate"
    /></PageHeading>
    <div v-if="data && leader" class="mb-8 grid gap-4 sm:grid-cols-3">
      <div class="relative overflow-hidden rounded-2xl bg-emerald-900 p-6 text-white">
        <AppIcon name="globe" :size="88" class="absolute top-6 right-4 text-emerald-700/40" />
        <p class="relative text-[10px] tracking-[0.14em] text-emerald-200 uppercase">Most open</p>
        <p class="relative mt-3 text-4xl font-medium tracking-tight">
          {{ scoreOf(leader, score)
          }}<span class="ml-2 text-xs font-normal tracking-normal text-emerald-100/70"
            >of {{ leader.total }} passports</span
          >
        </p>
        <p class="relative mt-4 flex items-center gap-2 text-xs">
          <CountryFlag :code="leader.code" :size="20" />{{ leader.name
          }}<span v-if="topCount > 1" class="text-emerald-200">+ {{ topCount - 1 }} tied</span>
        </p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-white p-6">
        <p class="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Destinations ranked</p>
        <p class="mt-3 text-4xl font-medium tracking-tight">{{ data.destinations.length }}</p>
        <p class="mt-4 text-xs text-stone-500">Each rated by all 198 other passports</p>
      </div>
      <div class="rounded-2xl border border-stone-200 bg-[#eef0e5] p-6">
        <p class="text-[10px] tracking-[0.14em] text-stone-600 uppercase">Average</p>
        <p class="mt-3 text-4xl font-medium tracking-tight">
          {{ average }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-600">passports</span>
        </p>
        <p class="mt-4 text-xs text-stone-600">
          {{ score === 'mobility' ? 'Let in without a visa in advance' : 'Let in without a visa' }}, per destination
        </p>
      </div>
    </div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <ScoreToggle v-model="score" />
      <p class="text-xs text-stone-500">
        {{
          score === 'mobility'
            ? 'Counts visa-free, visa on arrival and eTA entry.'
            : 'Counts only entry with no approval needed before travel.'
        }}
      </p>
    </div>
    <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a destination…" />
    <div class="my-5 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
      <p>{{ rows.length }} {{ rows.length === 1 ? 'destination' : 'destinations' }} · ranked globally</p>
      <p>Equal scores share a rank</p>
    </div>
    <EmptyState v-if="error" title="The destinations couldn’t load" description="Try loading them again."
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
          Destinations ranked by the number of passports they let in
          {{
            score === 'mobility' ? 'without a visa in advance' : 'without a visa'
          }}. Regional and search filters keep the global ranks.
        </caption>
        <thead class="border-b border-stone-200 bg-stone-50 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
          <tr>
            <th scope="col" class="px-4 py-4 font-medium sm:px-6">Rank</th>
            <th scope="col" class="px-3 py-4 font-medium sm:px-6">Destination</th>
            <th scope="col" class="hidden px-6 py-4 font-medium md:table-cell">Region</th>
            <th scope="col" class="px-4 py-4 text-right font-medium sm:px-6">
              {{ score === 'mobility' ? 'Mobility' : 'Visa-free' }}<span class="hidden sm:inline"> passports</span>
            </th>
            <th scope="col" class="hidden px-6 py-4 font-medium sm:table-cell">
              <span class="sr-only">Rules</span>
            </th>
          </tr>
        </thead>
        <!-- Like the passport ranking, the rows hydrate once they scroll into view. -->
        <LazyRankingRows :rows="rows" hydrate-on-visible />
      </table>
    </div>
    <p class="mt-5 max-w-3xl text-xs leading-6 text-stone-500">
      A destination scores one point for each passport whose holders can visit without a visa. The mobility score also
      counts passports that can get a visa on arrival or enter with an eTA. Rules that aren’t confirmed don’t count.
    </p>
  </div>
</template>
