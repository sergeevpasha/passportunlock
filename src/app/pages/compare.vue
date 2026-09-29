<script setup lang="ts">
import {
  comparisonStats,
  entryLabels,
  matchesComparisonFilter,
  requirementTypes,
  type ComparisonFilter,
} from '#shared/passports';
import { matchesCountry } from '#shared/catalogue';
import { comparisonQuery, maxPassports } from '#shared/comparison-query';
import { dateLabel, joinNames } from '~/utils/entry';
import { comparisonCsv } from '~/utils/export-comparison';
const { request, selections, query, setPassport, setSnapshot, removePassport } = usePassportComparison();
const { data, error, status, refresh } = await request;
// A comparison that fails has no passport list, so the error message and the picker use the directory instead.
const directory = useFetch('/api/passports', { immediate: false });
if (error.value) await directory.execute();
watch(error, failed => {
  if (failed && !directory.data.value) directory.execute();
});
const picker = useTemplateRef('picker');
const pickerIndex = ref(0);
const search = ref('');
const region = ref('All regions');
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
const rows = computed(() => data.value?.rows ?? []);
const codes = computed(() => columns.value.map(column => column.code));
const stats = computed(() => comparisonStats(rows.value, codes.value));
const single = computed(() => (columns.value.length === 1 ? columns.value[0] : undefined));
const route = useRoute();
// Each set of passports is its own page; snapshot choices only change the view, so they stay out of the address.
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
    const all = columns.length === 2 ? 'both' : 'all three';
    return `${joinNames(columns.map(column => column.name))} passports compared: ${stats.value.combined} destinations are visa-free with at least one of them, ${stats.value.shared} with ${all}.`;
  },
  path: () =>
    route.query.p1
      ? `/compare?${new URLSearchParams(comparisonQuery(selections.value.map(({ code }) => ({ code }))))}`
      : '/compare',
});
const snapshotOptions = computed(() =>
  data.value
    ? [
        { value: 'latest', label: `Latest available · ${dateLabel(data.value.snapshots[0]!.sourceDate)}` },
        ...data.value.snapshots.map(snapshot => ({ value: snapshot.id, label: dateLabel(snapshot.sourceDate) })),
      ]
    : []
);
const mixedDates = computed(() => new Set(columns.value.map(column => column.snapshot.id)).size > 1);
const mapOptions = computed(() => [
  { value: 'combined' as const, label: 'Combined access' },
  ...columns.value.map((column, index) => ({
    value: index,
    label: mixedDates.value ? `${column.name} · ${dateLabel(column.snapshot.sourceDate)}` : column.name,
  })),
]);
const mapHeading = computed(() => {
  if (columns.value.length < 2) return 'Access by destination';
  return mapPassport.value === 'combined' ? 'Combined access' : `${columns.value[mapPassport.value]?.name} passport`;
});
const cardStats = (counts: Record<string, number>) => [
  { label: 'On arrival', value: counts['visa on arrival'] },
  { label: 'eTA / eVisa', value: (counts.eta ?? 0) + (counts['e-visa'] ?? 0) },
  { label: 'Visa / restricted', value: (counts['visa required'] ?? 0) + (counts['no admission'] ?? 0) },
];
const mapStats = computed(() => [
  { label: 'Visa-free with any', value: stats.value.combined },
  { label: 'Visa-free with all', value: stats.value.shared },
  {
    label: `Added by ${joinNames(
      columns.value.slice(1).map(column => column.name),
      'or'
    )}`,
    value: `+${stats.value.additional}`,
  },
]);
const resultRows = computed(() =>
  rows.value.filter(row => {
    if (!matchesCountry(row, search.value, region.value)) return false;
    if (category.value !== 'all' && !row.rules.some(rule => rule.status === category.value)) return false;
    return matchesComparisonFilter(row, codes.value, filter.value);
  })
);
const filters = computed<{ value: ComparisonFilter; label: string; count: number }[]>(() => [
  { value: 'all', label: 'All destinations', count: rows.value.length },
  ...(columns.value.length > 1
    ? [{ value: 'different' as const, label: 'Differences', count: stats.value.differences }]
    : []),
  { value: 'shared', label: columns.value.length > 1 ? 'Visa-free with all' : 'Visa-free', count: stats.value.shared },
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
const pickerCountries = computed(() => data.value?.countries ?? directory.data.value?.passports ?? []);
const takenCodes = computed(() =>
  selections.value.filter((_, index) => index !== pickerIndex.value).map(selection => selection.code)
);
// Which requested codes aren't passports, known once a passport list has loaded.
const unknownCodes = computed(() => {
  const known = new Set(pickerCountries.value.map(country => country.code));
  return known.size ? selections.value.map(selection => selection.code).filter(code => !known.has(code)) : [];
});
function choosePassport(index: number) {
  pickerIndex.value = index;
  picker.value?.open();
}
function clearFilters() {
  search.value = '';
  region.value = 'All regions';
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
      :eyebrow="single ? 'Passport' : 'Compare'"
      :title="single ? `${single.name} passport` : 'Compare passports'"
      :description="
        single
          ? 'The entry rule for every destination. Add up to two more passports to compare them.'
          : 'The entry rule for every destination, for up to three passports side by side, and where they differ.'
      "
    >
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="!data || !!error"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium enabled:hover:border-emerald-700 disabled:opacity-40"
          @click="share"
        >
          <AppIcon name="share" :size="16" />Share</button
        ><button
          type="button"
          :disabled="!data || !!error || status === 'pending'"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium enabled:hover:border-emerald-700 disabled:opacity-40"
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
      icon="info"
      :title="
        unknownCodes.length === 1
          ? `There’s no passport with the code ${unknownCodes[0]}`
          : unknownCodes.length
            ? `There are no passports with the codes ${joinNames(unknownCodes)}`
            : 'This comparison couldn’t load'
      "
      :description="
        unknownCodes.length ? 'Choose a passport to compare instead.' : 'Check your connection and try again.'
      "
    >
      <button
        v-if="unknownCodes.length"
        type="button"
        class="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        @click="choosePassport(selections.findIndex(selection => unknownCodes.includes(selection.code)))"
      >
        Choose a passport
      </button>
      <button
        v-else
        type="button"
        class="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        @click="refresh()"
      >
        Try again
      </button>
    </EmptyState>
    <div
      v-else-if="data"
      :aria-busy="status === 'pending'"
      :class="status === 'pending' ? 'pointer-events-none opacity-60' : ''"
    >
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(column, index) in columns"
          :key="column.code"
          class="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
          :class="single && 'lg:col-span-2'"
        >
          <div class="flex items-start gap-2">
            <button
              type="button"
              :aria-label="`Change passport: ${column.name}`"
              class="-m-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left hover:bg-stone-50"
              @click="choosePassport(index)"
            >
              <CountryFlag :code="column.code" :size="40" eager /><span class="min-w-0 flex-1"
                ><span class="block truncate text-lg leading-6 font-semibold tracking-tight">{{ column.name }}</span
                ><span class="block text-sm text-stone-600">{{ column.region }}</span></span
              ><span class="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-800"
                >Change<AppIcon name="down" :size="14"
              /></span>
            </button>
            <button
              v-if="columns.length > 1"
              type="button"
              :aria-label="`Remove ${column.name}`"
              class="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              @click="removePassport(index)"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </div>
          <p class="mt-4 flex items-baseline gap-2 sm:mt-5">
            <span class="text-4xl font-medium tracking-tight text-emerald-900 sm:text-5xl">{{
              column.counts['visa free']
            }}</span
            ><span class="text-sm text-stone-600">visa-free destinations</span>
          </p>
          <dl class="mt-3 grid max-w-md grid-cols-3 gap-2 border-t border-stone-100 pt-3 sm:mt-4 sm:pt-4">
            <div v-for="stat in cardStats(column.counts)" :key="stat.label" class="flex flex-col-reverse">
              <dt class="mt-0.5 text-xs text-stone-600">{{ stat.label }}</dt>
              <dd class="text-base font-semibold">{{ stat.value }}</dd>
            </div>
          </dl>
          <template v-if="data.snapshots.length > 1">
            <label :for="`snapshot-${index}`" class="mt-5 block text-xs text-stone-600">Data snapshot</label
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
          v-if="columns.length < maxPassports"
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-100/40 p-4 text-left transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 motion-reduce:transition-none sm:min-h-48 sm:flex-col sm:justify-center sm:p-6 sm:text-center"
          @click="choosePassport(columns.length)"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-emerald-800 sm:h-12 sm:w-12"
            ><AppIcon name="plus" :size="20" /></span
          ><span
            ><span class="block text-sm font-medium">Add a passport</span
            ><span class="mt-0.5 block text-xs text-stone-600">Compare up to three</span></span
          >
        </button>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DataNote :date="mixedDates ? undefined : columns[0]?.snapshot.sourceDate" />
        <p v-if="mixedDates" class="text-xs text-amber-800">
          Different snapshot dates selected. Combined access is illustrative.
        </p>
        <NuxtLink to="/passports" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-800"
          >All passports<AppIcon name="arrow" :size="14"
        /></NuxtLink>
      </div>
      <section class="mt-9 rounded-2xl border border-stone-200 bg-panel p-5 sm:p-8" aria-labelledby="access-heading">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-xl">
            <p class="eyebrow text-emerald-800">Map</p>
            <h2 id="access-heading" class="mt-2 text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
              {{ mapHeading }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-stone-600">
              {{
                columns.length > 1 && mapPassport === 'combined'
                  ? 'Each destination is coloured by the easiest way in with any of the selected passports.'
                  : 'Each destination is coloured by its entry rule.'
              }}
            </p>
          </div>
          <SelectMenu
            v-if="columns.length > 1"
            v-model="mapPassport"
            :options="mapOptions"
            label="Show on the map"
            size="sm"
            align="end"
            class="w-full sm:w-64"
          />
        </div>
        <template v-if="columns.length > 1">
          <dl class="mt-6 grid grid-cols-3 gap-4 sm:flex sm:gap-x-10">
            <div v-for="stat in mapStats" :key="stat.label" class="flex flex-col-reverse">
              <dt class="mt-1 text-xs text-stone-600 sm:text-sm">{{ stat.label }}</dt>
              <dd class="text-2xl font-medium text-emerald-900 sm:text-3xl">{{ stat.value }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-xs text-stone-600">
            {{ joinNames(columns.map(column => column.name)) }} themselves aren’t counted.
          </p>
        </template>
        <PassportMap class="mt-6" :rows="rows" :passports="columns" :passport="mapPassport" />
      </section>
      <section class="mt-10" aria-labelledby="destinations-heading">
        <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 id="destinations-heading" class="text-xl font-semibold tracking-tight">Destinations</h2>
          <p class="text-sm text-stone-600">
            {{ resultRows.length }} {{ resultRows.length === 1 ? 'destination' : 'destinations' }}
          </p>
        </div>
        <CountryFilters v-model:search="search" v-model:region="region" placeholder="Search destinations…"
          ><SelectMenu v-model="category" :options="categories" label="Filter by entry requirement" class="sm:w-52"
        /></CountryFilters>
        <div class="my-5 flex flex-wrap gap-2">
          <button
            v-for="item in filters"
            :key="item.value"
            type="button"
            :aria-pressed="filter === item.value"
            class="flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
            :class="
              filter === item.value
                ? 'border-emerald-900 bg-emerald-900 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-800'
            "
            @click="filter = item.value"
          >
            {{ item.label
            }}<span :class="filter === item.value ? 'text-emerald-200' : 'text-stone-500'">{{ item.count }}</span>
          </button>
        </div>
        <p v-if="columns.length > 1" class="mb-3 flex items-center gap-2 text-xs text-stone-600">
          <span class="h-3 w-3 shrink-0 rounded-sm bg-lime-50 ring-1 ring-lime-300 ring-inset" />Where the passports
          differ, the easiest way in is highlighted.
        </p>
        <DestinationTable v-if="resultRows.length" :rows="resultRows" :columns="columns" /><EmptyState v-else
          ><button type="button" class="text-sm text-emerald-800 underline" @click="clearFilters">
            Clear filters
          </button></EmptyState
        >
        <p class="mt-5 text-xs leading-6 text-stone-600">
          Rules as of the date shown. An eTA or eVisa requires approval before travel. Missing stay durations do not
          mean unlimited entry.
          <NuxtLink to="/about" class="text-emerald-800 underline underline-offset-4">How to read this data.</NuxtLink>
        </p>
      </section>
    </div>
    <PassportPicker
      v-if="pickerCountries.length"
      ref="picker"
      :countries="pickerCountries"
      :taken="takenCodes"
      :current="selections[pickerIndex]?.code"
      @select="setPassport(pickerIndex, $event)"
    />
  </div>
</template>
