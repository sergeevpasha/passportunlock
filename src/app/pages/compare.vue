<script setup lang="ts">
import {
  comparisonStats,
  entryLabels,
  matchesComparisonFilter,
  mobilityScore,
  requirementTypes,
  type ComparisonFilter,
} from '#shared/passports';
import { matchesCountry } from '#shared/catalogue';
import { allCountries } from '#shared/countries';
import { passportPath } from '#shared/country-paths';
import { comparisonQuery, maxPassports } from '#shared/comparison-query';
import { dateLabel } from '~/utils/entry';
import { comparisonCsv } from '~/utils/export-comparison';
const { request, selections, query, setPassport, setSnapshot, removePassport } = usePassportComparison();
const { data, error, status, refresh } = await request;
const picker = useTemplateRef('picker');
const pickerIndex = ref(0);
const search = ref('');
const group = ref(allCountries);
const filter = ref<ComparisonFilter>('all');
const category = ref('all');
const mapPassport = ref<number | 'combined'>('combined');
const categories = [
  { value: 'all', label: 'All entry types' },
  ...requirementTypes.map(type => ({ value: type, label: entryLabels[type] })),
  { value: 'unknown', label: entryLabels.unknown },
  { value: 'domestic', label: 'Home country' },
];
const toast = ref('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(toastTimer));
const columns = computed(() => data.value?.columns ?? []);
const pickerCountries = computed(() =>
  (data.value?.countries ?? []).map(country => ({ ...country, detail: `${country.visaFree} visa-free` }))
);
const rows = computed(() => data.value?.rows ?? []);
const codes = computed(() => columns.value.map(column => column.code));
const stats = computed(() => comparisonStats(rows.value, codes.value));
const route = useRoute();
// Each set of passports is its own page; snapshot choices only change the view, so they stay out of the address. A
// single passport has a page of its own, which search engines are pointed to instead.
usePageSeo({
  title: () => {
    const names = data.value?.columns.map(column => column.name) ?? [];
    if (names.length === 1) return `${names[0]} passport visa requirements · Passport Unlock`;
    return names.length ? `${names.join(' vs ')} passports · Passport Unlock` : 'Compare passports · Passport Unlock';
  },
  description: () => {
    const columns = data.value?.columns ?? [];
    if (columns.length === 1) {
      const { name, counts } = columns[0]!;
      return `Entry rules for ${name} passport holders: ${counts['visa free']} destinations without a visa, ${counts['visa on arrival']} with a visa on arrival and ${counts.eta + counts['e-visa']} with an eTA or eVisa.`;
    }
    if (!columns.length) return 'The entry rule for every destination, for up to three passports side by side.';
    const names = columns.map(column => column.name);
    const all = names.length === 2 ? 'both' : 'all three';
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)} passports compared: ${stats.value.combined} destinations are visa-free with at least one of them, ${stats.value.shared} with ${all}.`;
  },
  path: () => {
    if (!route.query.p1) return '/compare';
    if (selections.value.length === 1) return passportPath(selections.value[0]!.code);
    return `/compare?${new URLSearchParams(comparisonQuery(selections.value.map(({ code }) => ({ code }))))}`;
  },
});
const snapshotOptions = computed(() =>
  data.value
    ? [
        { value: 'latest', label: `Latest available · ${dateLabel(data.value.snapshots[0]!.sourceDate)}` },
        ...data.value.snapshots.map(snapshot => ({ value: snapshot.id, label: dateLabel(snapshot.sourceDate) })),
      ]
    : []
);
const mapOptions = computed(() => [
  { value: 'combined' as const, label: columns.value.length > 1 ? 'Combined access' : 'Passport access' },
  ...columns.value.map((column, index) => ({
    value: index,
    label: `${column.name} · ${dateLabel(column.snapshot.sourceDate)}`,
  })),
]);
const mixedDates = computed(() => new Set(columns.value.map(column => column.snapshot.id)).size > 1);
const resultRows = computed(() =>
  rows.value.filter(row => {
    if (!matchesCountry(row, search.value, group.value)) return false;
    if (category.value !== 'all' && !row.rules.some(rule => rule.status === category.value)) return false;
    return matchesComparisonFilter(row, codes.value, filter.value);
  })
);
const filters = computed<{ value: ComparisonFilter; label: string; count: number }[]>(() => [
  { value: 'all', label: 'All destinations', count: rows.value.length },
  ...(columns.value.length > 1
    ? [{ value: 'different' as const, label: 'Differences', count: stats.value.differences }]
    : []),
  { value: 'shared', label: columns.value.length > 1 ? 'Visa-free for all' : 'Visa-free', count: stats.value.shared },
  ...(columns.value.length > 1
    ? [{ value: 'combined' as const, label: 'Visa-free with any', count: stats.value.combined }]
    : []),
]);
watch(
  () => columns.value.length,
  () => {
    mapPassport.value = 'combined';
    filter.value = 'all';
  }
);
function choosePassport(index: number) {
  pickerIndex.value = index;
  picker.value?.open();
}
function clearFilters() {
  search.value = '';
  group.value = allCountries;
  category.value = 'all';
  filter.value = 'all';
}
function downloadComparison() {
  const url = URL.createObjectURL(
    new Blob([comparisonCsv(columns.value, resultRows.value)], { type: 'text/csv;charset=utf-8;' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'passport-comparison.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function share() {
  const url = new URL('/compare', window.location.origin);
  url.search = new URLSearchParams(query.value).toString();
  try {
    await navigator.clipboard.writeText(url.toString());
    toast.value = 'Comparison link copied.';
  } catch {
    toast.value = 'Copy the comparison link from your address bar.';
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 4000);
}
</script>

<template>
  <div>
    <PageHeading
      eyebrow="03 / Compare"
      title="Compare passports"
      description="The entry rule for every destination, for up to three passports side by side, and where they differ."
    >
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium hover:border-emerald-700"
          @click="share"
        >
          <AppIcon name="share" :size="16" />Share</button
        ><button
          type="button"
          :disabled="!data || !!error || status === 'pending'"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium hover:border-emerald-700 disabled:opacity-40"
          @click="downloadComparison"
        >
          <AppIcon name="download" :size="16" />Export CSV
        </button>
      </div>
    </PageHeading>
    <p role="status" class="sr-only">{{ toast }}{{ status === 'pending' ? 'Updating comparison.' : '' }}</p>
    <div
      v-if="toast"
      class="fixed right-5 bottom-5 z-30 rounded-xl bg-emerald-950 px-5 py-4 text-sm text-white shadow-lg"
    >
      {{ toast }}
    </div>
    <EmptyState
      v-if="error"
      title="This comparison couldn’t load"
      description="A passport may be unavailable. Try again, or choose different passports."
      ><div class="flex justify-center gap-5">
        <button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">Try again</button
        ><NuxtLink to="/passports" class="text-sm text-emerald-800 underline">Choose passports</NuxtLink>
      </div></EmptyState
    >
    <div
      v-else-if="data"
      :aria-busy="status === 'pending'"
      :class="status === 'pending' ? 'pointer-events-none opacity-60' : ''"
    >
      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="(column, index) in columns"
          :key="index"
          class="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] tracking-widest text-stone-500">PASSPORT 0{{ index + 1 }}</span
            ><button
              v-if="columns.length > 1"
              type="button"
              :aria-label="`Remove ${column.name}`"
              class="-m-1 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
              @click="removePassport(index)"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </div>
          <button
            type="button"
            :aria-label="`Change ${column.name} passport`"
            class="mt-5 flex w-full items-center gap-3 text-left"
            @click="choosePassport(index)"
          >
            <CountryFlag :code="column.code" :size="38" eager /><span class="flex-1"
              ><span class="block text-lg font-semibold tracking-tight">{{ column.name }}</span
              ><span class="text-xs text-stone-500">{{ column.region }}</span></span
            ><AppIcon name="down" :size="17" class="text-stone-400" />
          </button>
          <p class="mt-6 flex items-baseline gap-2">
            <span class="text-5xl font-medium tracking-[-0.05em] text-emerald-900">{{
              column.counts['visa free']
            }}</span
            ><span class="text-xs text-stone-500">visa-free destinations</span>
          </p>
          <div class="mt-5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-4">
            <div>
              <p class="text-base font-semibold">{{ column.counts['visa on arrival'] }}</p>
              <p class="mt-0.5 text-[10px] text-stone-500">On arrival</p>
            </div>
            <div>
              <p class="text-base font-semibold">{{ column.counts.eta + column.counts['e-visa'] }}</p>
              <p class="mt-0.5 text-[10px] text-stone-500">eTA / eVisa</p>
            </div>
            <div>
              <p class="text-base font-semibold">
                {{ column.counts['visa required'] + column.counts['no admission'] }}
              </p>
              <p class="mt-0.5 text-[10px] text-stone-500">Visa / restricted</p>
            </div>
          </div>
          <p class="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
            <span>Mobility score: visa-free, on arrival or eTA</span
            ><span class="font-semibold text-[#202923] tabular-nums">{{ mobilityScore(column.counts) }}</span>
          </p>
          <template v-if="data.snapshots.length > 1">
            <label :for="`snapshot-${index}`" class="mt-5 block text-[10px] text-stone-500">Data snapshot</label
            ><SelectMenu
              :id="`snapshot-${index}`"
              :model-value="selections[index]?.snapshot === column.snapshot.id ? column.snapshot.id : 'latest'"
              :options="snapshotOptions"
              size="sm"
              class="mt-1"
              @update:model-value="setSnapshot(index, $event)"
            />
          </template>
        </article>
        <button
          v-for="slot in maxPassports - columns.length"
          :key="`add-${slot}`"
          type="button"
          class="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100/40 p-6 text-center transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 motion-reduce:transition-none"
          @click="choosePassport(columns.length)"
        >
          <span
            class="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-emerald-800"
            ><AppIcon name="plus" :size="23" /></span
          ><span class="text-sm font-medium">Add a passport</span
          ><span class="mt-2 text-xs text-stone-600">Compare up to three</span>
        </button>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DataNote :date="mixedDates ? undefined : columns[0]?.snapshot.sourceDate" />
        <p v-if="mixedDates" class="text-xs text-amber-800">
          Different snapshot dates selected. Combined access is illustrative.
        </p>
        <NuxtLink to="/passports" class="inline-flex items-center gap-1 text-xs font-medium text-emerald-800"
          >Browse all passports<AppIcon name="arrow" :size="14"
        /></NuxtLink>
      </div>
      <section
        class="mt-9 grid overflow-hidden rounded-2xl border border-stone-200 bg-[#eef0e5] lg:grid-cols-[1fr_1.5fr]"
        aria-labelledby="access-heading"
      >
        <div class="p-6 sm:p-8">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">Map</p>
          <h2 id="access-heading" class="mt-3 max-w-70 text-3xl leading-tight font-medium tracking-tight">
            {{ columns.length > 1 ? 'Combined access' : 'Access by destination' }}
          </h2>
          <p class="mt-3 max-w-75 text-xs leading-6 text-stone-600">
            {{
              mapPassport === 'combined' && columns.length > 1
                ? 'The map shows the easiest way into each destination with any of the selected passports.'
                : 'The map shows the entry rule for each destination.'
            }}
          </p>
          <div class="mt-7 flex gap-7">
            <div>
              <p class="text-3xl font-medium text-emerald-900">{{ stats.combined }}</p>
              <p class="mt-1 text-[10px] text-stone-600">
                {{ columns.length > 1 ? 'Combined visa-free' : 'Visa-free destinations' }}
              </p>
            </div>
            <div v-if="columns.length > 1">
              <p class="text-3xl font-medium text-emerald-900">{{ stats.shared }}</p>
              <p class="mt-1 text-[10px] text-stone-600">Shared visa-free</p>
            </div>
            <div v-if="columns.length > 1">
              <p class="text-3xl font-medium text-emerald-900">+{{ stats.additional }}</p>
              <p class="mt-1 text-[10px] text-stone-600">Beyond first passport</p>
            </div>
          </div>
          <p class="mt-5 text-[10px] leading-5 text-stone-600">
            Combined and shared totals exclude every selected home country.
          </p>
        </div>
        <div class="p-5">
          <SelectMenu
            v-model="mapPassport"
            :options="mapOptions"
            label="Show access on map for"
            size="sm"
            align="end"
            class="ml-auto w-64 max-w-full"
          /><!-- The map projects every country in the browser, so its code loads once the map scrolls into view. -->
          <LazyPassportMap :rows="rows" :passports="columns" :passport="mapPassport" hydrate-on-visible />
        </div>
      </section>
      <section class="mt-10" aria-labelledby="destinations-heading">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="destinations-heading" class="text-xl font-semibold tracking-tight">Destinations</h2>
          <p class="text-xs text-stone-500">
            {{ resultRows.length }} {{ resultRows.length === 1 ? 'destination' : 'destinations' }}
          </p>
        </div>
        <CountryFilters v-model:search="search" v-model:group="group" placeholder="Search destinations…"
          ><SelectMenu v-model="category" :options="categories" label="Filter by entry requirement" class="sm:w-52"
        /></CountryFilters>
        <div class="my-5 flex flex-wrap gap-2">
          <button
            v-for="item in filters"
            :key="item.value"
            type="button"
            :aria-pressed="filter === item.value"
            class="flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium"
            :class="
              filter === item.value
                ? 'border-emerald-900 bg-emerald-900 text-white'
                : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-800'
            "
            @click="filter = item.value"
          >
            {{ item.label }}<span class="font-normal">{{ item.count }}</span>
          </button>
        </div>
        <!-- The table has one row per destination and nothing to click, so it hydrates only on interaction. -->
        <LazyDestinationTable
          v-if="resultRows.length"
          :rows="resultRows"
          :columns="columns"
          hydrate-on-interaction
        /><EmptyState v-else
          ><button type="button" class="text-sm text-emerald-800 underline" @click="clearFilters">
            Clear filters
          </button></EmptyState
        >
        <p class="mt-5 text-xs leading-6 text-stone-500">
          Rules as of the date shown in each column. An eTA or eVisa requires approval before travel. Missing stay
          durations do not mean unlimited entry.
          <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">How to read this data.</NuxtLink>
        </p>
      </section>
    </div>
    <CountryPicker
      v-if="data"
      ref="picker"
      :countries="pickerCountries"
      icon="plus"
      @select="setPassport(pickerIndex, $event)"
    />
  </div>
</template>
