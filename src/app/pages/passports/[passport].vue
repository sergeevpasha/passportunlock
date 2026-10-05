<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import { allCountries, countryNameInText } from '#shared/countries';
import { countryFromSegment, entryPath, passportPath } from '#shared/country-paths';
import { entryLabels, requirementTypes, type EntryRule } from '#shared/passports';

const route = useRoute();
const country = countryFromSegment(route.params.passport);
if (!country) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
if (!country.canonical) await navigateTo(passportPath(country.code), { redirectCode: 301 });
const { data, error, refresh } = await useFetch(`/api/passports/${country.code.toLowerCase()}`);
const name = computed(() => data.value?.passport.name ?? country.code);

usePageSeo({
  title: () => `${name.value} passport: visa-free countries and visa requirements · Passport Unlock`,
  description: () => {
    if (!data.value) return `Where ${name.value} passport holders can travel without a visa.`;
    const { counts, passport, passports } = data.value;
    const parts = [
      [counts['visa on arrival'], 'offer a visa on arrival'],
      [counts.eta, 'need an eTA'],
      [counts['e-visa'], 'need an eVisa'],
    ].flatMap(([count, text]) => (count ? [`${count} ${text}`] : []));
    return `${name.value} passport holders can visit ${passport.visaFree} of ${passport.total} destinations without a visa, rank ${passport.rank} of ${passports} passports.${parts.length ? ` Of the rest, ${new Intl.ListFormat('en').format(parts)}.` : ''}`;
  },
});

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
      linkLabel: `${name.value} passport holders visiting ${countryNameInText(destination.code, destination.name)}`,
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
            Where {{ name }} passport holders can travel without a visa, and the entry rule for every other destination.
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
            Where {{ name }} passport holders can go
          </h2>
          <p class="mt-3 max-w-75 text-xs leading-6 text-stone-600">
            Each destination is coloured by how {{ name }} passport holders can enter it.
          </p>
        </div>
        <div class="p-5">
          <!-- The map projects every country in the browser, so its code loads once the map scrolls into view. -->
          <LazyPassportMap
            :rows="mapRows"
            :passports="[{ name }]"
            :passport="0"
            :label="`World map of how ${name} passport holders can enter each destination. The table below lists every rule.`"
            hydrate-on-visible
          />
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
        <div v-if="rows.length" class="mt-5 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">
              The entry rule for
              {{
                name
              }}
              passport holders at each destination.
            </caption>
            <thead class="border-b border-stone-200 bg-stone-50 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
              <tr>
                <th scope="col" class="px-4 py-4 font-medium sm:px-6">Destination</th>
                <th scope="col" class="hidden px-6 py-4 font-medium md:table-cell">Region</th>
                <th scope="col" class="px-4 py-4 font-medium sm:px-6">Entry rule</th>
                <th scope="col" class="hidden px-6 py-4 font-medium sm:table-cell">
                  <span class="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <!-- 198 linked rows hydrate once they scroll into view, like the ranking rows. -->
            <LazyEntryRows :rows="rows" hydrate-on-visible />
          </table>
        </div>
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
