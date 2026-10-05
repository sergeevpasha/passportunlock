<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import { allCountries, countryNameInText } from '#shared/countries';
import { countryFromSegment, destinationPath, entryPath } from '#shared/country-paths';
import { entryLabels, requirementTypes, type EntryRule } from '#shared/passports';
import { approvalKinds } from '#shared/requirements';
import { entryShortLabels, siteHost, sitePage } from '~/utils/entry';

const route = useRoute();
const country = countryFromSegment(route.params.destination);
if (!country) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
if (!country.canonical) await navigateTo(destinationPath(country.code), { redirectCode: 301 });
const { data, error, refresh } = await useFetch(`/api/destinations/${country.code.toLowerCase()}`);
const name = computed(() => data.value?.destination.name ?? country.code);
const nameInText = computed(() => countryNameInText(country.code, name.value));

usePageSeo({
  title: () => `${name.value} visa requirements for every passport · Passport Unlock`,
  description: () => {
    if (!data.value) return `How holders of every passport can enter ${nameInText.value}.`;
    const { counts, destination } = data.value;
    const parts = [
      [counts['visa free'], 'can visit without a visa'],
      [counts['visa on arrival'], 'can get a visa on arrival'],
      [counts.eta, 'need an eTA'],
      [counts['e-visa'], 'need an eVisa'],
      [counts['visa required'], 'need a visa in advance'],
    ].flatMap(([count, text]) => (count ? [`${count} ${text}`] : []));
    return `How holders of each of the ${destination.total} other passports can enter ${nameInText.value}: ${new Intl.ListFormat('en').format(parts)}.`;
  },
});

// The destination's page about visas and its site for each entry type that needs one, once per page.
const officialSites = computed(() => {
  const sites = new Map<string, { url: string; labels: string[] }>();
  const links: [string | undefined, string][] = [
    [data.value?.visaPage ?? undefined, 'Visa information'],
    ...approvalKinds.map(
      kind => [data.value?.officialSites[kind]?.url, entryShortLabels[kind]] as [string | undefined, string]
    ),
  ];
  for (const [url, label] of links) {
    if (!url) continue;
    const site = sites.get(sitePage(url)) ?? { url, labels: [] };
    site.labels.push(label);
    sites.set(sitePage(url), site);
  }
  return [...sites.values()].map(({ url, labels }) => ({ url, label: labels.join(' · ') }));
});

const search = ref('');
const group = ref(allCountries);
const category = ref('all');
const categories = [
  { value: 'all', label: 'All entry types' },
  ...[...requirementTypes, 'unknown' as const].map(type => ({ value: type, label: entryLabels[type] })),
];
const rows = computed(() =>
  (data.value?.passports ?? [])
    .filter(
      passport =>
        matchesCountry(passport, search.value, group.value) &&
        (category.value === 'all' || passport.rule.status === category.value)
    )
    .map(passport => ({
      ...passport,
      href: entryPath(country.code, passport.code),
      linkLabel: `${passport.name} passport holders visiting ${nameInText.value}`,
    }))
);
// Each country on the map is a passport, coloured by how its holders enter; the destination itself is home.
const mapRows = computed(() => [
  ...(data.value?.passports ?? []).map(passport => ({
    code: passport.code,
    name: passport.name,
    rules: [passport.rule],
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
    <PageBreadcrumbs :items="[{ label: 'Destinations', to: '/destinations' }, { label: name }]" />
    <div class="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p class="mb-3 text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase">Destination</p>
        <h1 class="flex items-center gap-4 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-5xl">
          <CountryFlag :code="country.code" :size="44" eager />{{ name }} visa requirements
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-500 sm:text-base">
          How holders of every other passport can enter {{ nameInText }}, and for how long.
        </p>
      </div>
      <DataNote :date="data?.sourceDate" />
    </div>
    <EmptyState
      v-if="error"
      title="This destination couldn’t load"
      description="Try again, or choose another destination."
      ><div class="flex justify-center gap-5">
        <button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">Try again</button
        ><NuxtLink to="/destinations" class="text-sm text-emerald-800 underline">All destinations</NuxtLink>
      </div></EmptyState
    >
    <template v-else-if="data">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="relative overflow-hidden rounded-2xl bg-emerald-900 p-6 text-white">
          <p class="text-[10px] tracking-[0.14em] text-emerald-200 uppercase">Visa-free</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.destination.visaFree
            }}<span class="ml-2 text-xs font-normal tracking-normal text-emerald-100/70"
              >of {{ data.destination.total }} passports</span
            >
          </p>
          <p class="mt-4 text-xs text-emerald-100/80">
            Rank {{ data.destination.rank }} of {{ data.destinations }} destinations
          </p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-6">
          <p class="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Mobility score</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.destination.mobility
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-500"
              >of {{ data.destination.total }} passports</span
            >
          </p>
          <p class="mt-4 text-xs text-stone-500">
            Visa-free, on arrival or with an eTA · rank {{ data.destination.mobilityRank }}
          </p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-[#eef0e5] p-6">
          <p class="text-[10px] tracking-[0.14em] text-stone-600 uppercase">Visa needed in advance</p>
          <p class="mt-3 text-4xl font-medium tracking-tight">
            {{ data.counts['e-visa'] + data.counts['visa required']
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-600">passports</span>
          </p>
          <p class="mt-4 text-xs text-stone-600">
            {{ data.counts['e-visa'] }} by eVisa and {{ data.counts['visa required'] }} through an embassy<span
              v-if="data.counts['no admission']"
              >; {{ data.counts['no admission'] }} more restricted</span
            >
          </p>
        </div>
      </div>
      <section
        v-if="officialSites.length"
        class="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
        aria-labelledby="official-heading"
      >
        <h2 id="official-heading" class="text-sm font-semibold">Official sites</h2>
        <ul class="mt-4 flex flex-wrap gap-3">
          <li v-for="site in officialSites" :key="site.url" class="max-w-full">
            <a
              :href="site.url"
              class="group flex items-center gap-3 rounded-xl border border-emerald-800/15 bg-emerald-50/60 px-4 py-2.5 transition-colors hover:border-emerald-800/40 motion-reduce:transition-none"
              ><span class="text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">{{
                site.label
              }}</span
              ><span class="min-w-0 text-sm font-medium break-words">{{ siteHost(site.url) }}</span
              ><AppIcon name="diagonal" :size="16" class="text-emerald-800"
            /></a>
          </li>
        </ul>
        <p class="mt-3 text-xs leading-6 text-stone-500">
          The official sites for visitors to {{ nameInText }}. Agency sites with similar names charge extra fees.
        </p>
      </section>
      <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="check-heading">
        <h2 id="check-heading" class="mb-4 text-sm font-semibold">Check a passport</h2>
        <VisaChecker :destination="{ code: country.code, name }" />
      </section>
      <section
        class="mt-9 grid overflow-hidden rounded-2xl border border-stone-200 bg-[#eef0e5] lg:grid-cols-[1fr_1.5fr]"
        aria-labelledby="map-heading"
      >
        <div class="p-6 sm:p-8">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">Map</p>
          <h2 id="map-heading" class="mt-3 max-w-70 text-3xl leading-tight font-medium tracking-tight">
            Who can visit {{ nameInText }}
          </h2>
          <p class="mt-3 max-w-75 text-xs leading-6 text-stone-600">
            Each country is coloured by how holders of its passport can enter {{ nameInText }}.
          </p>
        </div>
        <div class="p-5">
          <!-- The map projects every country in the browser, so its code loads once the map scrolls into view. -->
          <LazyPassportMap
            :rows="mapRows"
            :passports="[{ name }]"
            :passport="0"
            unit="passport"
            :home="{ label: name, description: `The destination itself. Its own citizens need no visa.` }"
            :label="`World map of how each passport’s holders can enter ${nameInText}. The table below lists every rule.`"
            hydrate-on-visible
          />
        </div>
      </section>
      <section class="mt-10" aria-labelledby="passports-heading">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="passports-heading" class="text-xl font-semibold tracking-tight">Every passport</h2>
          <p class="text-xs text-stone-500">{{ rows.length }} {{ rows.length === 1 ? 'passport' : 'passports' }}</p>
        </div>
        <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a passport…"
          ><SelectMenu v-model="category" :options="categories" label="Filter by entry requirement" class="sm:w-52"
        /></CountryFilters>
        <div v-if="rows.length" class="mt-5 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">
              The entry rule for
              {{
                nameInText
              }}
              for holders of each passport.
            </caption>
            <thead class="border-b border-stone-200 bg-stone-50 text-[10px] tracking-[0.12em] text-stone-500 uppercase">
              <tr>
                <th scope="col" class="px-4 py-4 font-medium sm:px-6">Passport</th>
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
          <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">How to read this data.</NuxtLink>
        </p>
      </section>
    </template>
  </div>
</template>
