<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import { allCountries, countryNameInText } from '#shared/countries';
import { countryFromSegment, entryPath, passportPath } from '#shared/country-paths';
import { nationality } from '#shared/nationalities';
import { entryLabels, requirementTypes, type EntryRule, type EntryType } from '#shared/passports';
import { dateLabel, entryClasses, entryShortLabels } from '~/utils/entry';
import { followLink } from '~/utils/links';

const route = useRoute();
const country = countryFromSegment(route.params.passport);
if (!country) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
if (!country.canonical) await navigateTo(passportPath(country.code), { redirectCode: 301 });
const { data, error, refresh } = await useFetch(`/api/passports/${country.code.toLowerCase()}`);
const name = computed(() => data.value?.passport.name ?? country.code);
// Searchers name the holders by nationality: "visa-free countries for Dutch citizens".
const citizens = `${nationality(country.code)} citizens`;

usePageSeo({
  // The count and the year answer "how many countries can a … passport visit" in the result itself.
  title: () =>
    data.value
      ? `${name.value} passport: ${data.value.passport.visaFree} visa-free countries (${data.value.sourceDate.slice(0, 4)})`
      : `${name.value} passport: visa-free countries`,
  description: () => {
    if (!data.value) return `Where ${citizens} can travel without a visa.`;
    const { counts, passport, passports, sourceDate } = data.value;
    const parts = [
      [counts['visa on arrival'], 'offer a visa on arrival'],
      [counts.eta, 'need an eTA'],
      [counts['e-visa'], 'need an eVisa'],
    ].flatMap(([count, text]) => (count ? [`${count} ${text}`] : []));
    return `${citizens} can visit ${passport.visaFree} of ${passport.total} destinations without a visa, rank ${passport.rank} of ${passports} passports.${parts.length ? ` Of the rest, ${new Intl.ListFormat('en').format(parts)}.` : ''} Full list, checked ${dateLabel(sourceDate, 'long')}.`;
  },
});
// The heading over each entry type's list, in the words of the searches it answers.
const headings: Record<EntryType, string> = {
  'visa free': `Visa-free countries for ${citizens}`,
  'visa on arrival': 'Visa on arrival',
  eta: 'No visa, but an eTA first',
  'e-visa': 'eVisa needed',
  'visa required': 'Visa needed in advance',
  'no admission': 'Entry restricted',
  domestic: 'Home country',
  unknown: 'Not confirmed',
};
const { target: mapTarget, seen: mapSeen } = useSeenOnce();

const search = ref('');
const group = ref(allCountries);
const category = ref('all');
const categories = [
  { value: 'all', label: 'All entry types' },
  ...[...requirementTypes, 'unknown' as const].map(type => ({ value: type, label: entryLabels[type] })),
];
const rows = computed(() =>
  (data.value?.destinations ?? [])
    .filter(
      destination =>
        matchesCountry(destination, search.value, group.value) &&
        (category.value === 'all' || destination.rule.status === category.value)
    )
    .map(destination => ({
      ...destination,
      href: entryPath(destination.code, country.code),
      linkLabel: `${citizens} visiting ${countryNameInText(destination.code, destination.name)}`,
    }))
);
// Each country on the map is a destination, coloured by how the passport's holders enter it.
const mapRows = computed(() => [
  ...(data.value?.destinations ?? []).map(destination => ({
    code: destination.code,
    name: destination.name,
    rules: [destination.rule],
  })),
  { code: country.code, name: name.value, rules: [{ status: 'domestic' } as EntryRule] },
]);
function clearFilters() {
  search.value = '';
  group.value = allCountries;
  category.value = 'all';
}
</script>

<template>
  <div>
    <PageBreadcrumbs :items="[{ label: 'Passports', to: '/passports' }, { label: name }]" />
    <div class="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
        <!-- Every cover is 480×720 with the same outline. -->
        <img
          :src="`/covers/480/${country.code.toLowerCase()}.webp`"
          :alt="`Cover of the ${name} passport`"
          width="160"
          height="240"
          fetchpriority="high"
          decoding="async"
          class="h-auto w-28 shrink-0 drop-shadow-[0_3px_6px_rgb(28_25_23/0.22)] sm:w-36 lg:w-40"
        />
        <div>
          <p class="mb-3 text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase">Passport</p>
          <h1 class="flex items-center gap-4 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-5xl">
            <CountryFlag :code="country.code" :size="44" eager />{{ name }} passport
          </h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-500 sm:text-base">
            Where {{ citizens }} can travel without a visa, and the entry rule for every other destination.
          </p>
        </div>
      </div>
      <div class="flex flex-col items-start gap-3 sm:items-end">
        <NuxtLink
          :to="{ path: '/compare', query: { p1: country.code.toLowerCase() } }"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium hover:border-emerald-700"
          ><AppIcon name="compare" :size="16" />Compare with other passports</NuxtLink
        >
        <NuxtLink
          to="/passports/covers"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium hover:border-emerald-700"
          ><AppIcon name="passport" :size="16" />All passport covers</NuxtLink
        >
        <DataNote :date="data?.sourceDate" />
      </div>
    </div>
    <EmptyState v-if="error" title="This passport couldn’t load" description="Try again, or choose another passport."
      ><div class="flex justify-center gap-5">
        <button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">Try again</button
        ><NuxtLink to="/passports" class="text-sm text-emerald-800 underline">All passports</NuxtLink>
      </div></EmptyState
    >
    <template v-else-if="data">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="relative overflow-hidden rounded-2xl bg-emerald-900 p-6 text-white">
          <p class="text-[10px] tracking-[0.14em] text-emerald-200 uppercase">Visa-free</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.passport.visaFree
            }}<span class="ml-2 text-xs font-normal tracking-normal text-emerald-100/70"
              >of {{ data.passport.total }} destinations</span
            >
          </p>
          <p class="mt-4 text-xs text-emerald-100/80">
            Rank {{ data.passport.rank }} of {{ data.passports }} passports
          </p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-6">
          <p class="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Mobility score</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.passport.mobility
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-500"
              >of {{ data.passport.total }} destinations</span
            >
          </p>
          <p class="mt-4 text-xs text-stone-500">
            Visa-free, on arrival or with an eTA · rank {{ data.passport.mobilityRank }}
          </p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-[#eef0e5] p-6">
          <p class="text-[10px] tracking-[0.14em] text-stone-600 uppercase">Visa needed in advance</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.counts['e-visa'] + data.counts['visa required']
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-600">destinations</span>
          </p>
          <p class="mt-4 text-xs text-stone-600">
            {{ data.counts['e-visa'] }} by eVisa and {{ data.counts['visa required'] }} through an embassy<span
              v-if="data.counts['no admission']"
              >; {{ data.counts['no admission'] }} more restricted</span
            >
          </p>
        </div>
      </div>
      <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="check-heading">
        <h2 id="check-heading" class="mb-4 text-sm font-semibold">Check a destination</h2>
        <VisaChecker :passport="{ code: country.code, name }" />
      </section>
      <section
        class="mt-9 grid overflow-hidden rounded-2xl border border-stone-200 bg-[#eef0e5] lg:grid-cols-[1fr_1.5fr]"
        aria-labelledby="map-heading"
      >
        <div class="p-6 sm:p-8">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">Map</p>
          <h2 id="map-heading" class="mt-3 max-w-70 text-3xl leading-tight font-medium tracking-tight">
            Where {{ citizens }} can go
          </h2>
          <p class="mt-3 max-w-75 text-xs leading-6 text-stone-600">
            Each destination is coloured by how {{ citizens }} can enter it.
          </p>
        </div>
        <!-- The map is drawn in the browser once it is near the screen: its shapes would double the page's size, and
             the lists below give every rule in words. The box keeps the map's proportions until then. -->
        <div ref="mapTarget" class="p-5">
          <LazyPassportMap
            v-if="mapSeen"
            :rows="mapRows"
            :passports="[{ name }]"
            :passport="0"
            :label="`World map of how ${citizens} can enter each destination. The lists below give every rule.`"
          />
          <div v-else class="aspect-[1000/520] w-full" />
        </div>
      </section>
      <section v-if="data.unlocks.length" class="mt-10" aria-labelledby="unlocks-heading">
        <h2 id="unlocks-heading" class="text-xl font-semibold tracking-tight">
          What another country’s visa unlocks for {{ citizens }}
        </h2>
        <p class="mt-2 max-w-3xl text-sm leading-7 text-stone-500">
          With a valid visa or residence permit from one of these countries, {{ citizens }} can enter more destinations
          or apply more easily. Conditions differ, such as a visa that must be multiple-entry or already used, so each
          destination’s page gives them.
        </p>
        <div class="mt-5 grid gap-4 lg:grid-cols-2">
          <section
            v-for="unlock in data.unlocks.slice(0, 6)"
            :key="unlock.issuer"
            class="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <h3 class="text-sm font-semibold">
              A visa or residence permit from {{ unlock.issuer }}
              <span class="font-normal text-stone-500">({{ unlock.destinations.length }})</span>
            </h3>
            <ul class="mt-3 flex flex-wrap gap-2" @click="followLink">
              <li v-for="item in unlock.destinations" :key="item.code">
                <a
                  :href="entryPath(item.code, country.code)"
                  class="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs hover:border-emerald-700/40"
                  >{{ item.name
                  }}<span class="rounded px-1.5 py-0.5 text-[10px] font-medium" :class="entryClasses[item.grants]">{{
                    entryShortLabels[item.grants]
                  }}</span></a
                >
              </li>
            </ul>
          </section>
        </div>
      </section>
      <section class="mt-10" aria-labelledby="destinations-heading">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="destinations-heading" class="text-xl font-semibold tracking-tight">Every destination</h2>
          <p class="text-xs text-stone-500">
            {{ rows.length }} {{ rows.length === 1 ? 'destination' : 'destinations' }}
          </p>
        </div>
        <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a destination…"
          ><SelectMenu v-model="category" :options="categories" label="Filter by entry requirement" class="sm:w-52"
        /></CountryFilters>
        <EntryGroups
          v-if="rows.length"
          class="mt-6"
          :rows="rows"
          :headings="headings"
          column="Destination"
          :caption="`The entry rule for ${citizens} at each destination`"
        />
        <EmptyState v-else class="mt-5"
          ><button type="button" class="text-sm text-emerald-800 underline" @click="clearFilters">
            Clear filters
          </button></EmptyState
        >
        <p class="mt-5 text-xs leading-6 text-stone-500">
          An eTA or eVisa requires approval before travel. Missing stay durations do not mean unlimited entry.
        </p>
      </section>
    </template>
  </div>
</template>
