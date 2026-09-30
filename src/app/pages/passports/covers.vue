<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import { allCountries, countryGroupIds } from '#shared/countries';
import { passportPath } from '#shared/country-paths';
import { followLink } from '~/utils/links';

usePageSeo({
  title: 'Passport covers of every country · Passport Unlock',
  description:
    'The cover of all 199 passports in one gallery. Narrow it to a region or a group, and open a passport to see where it can travel.',
});
const { data, error, refresh } = await useFetch('/api/passports');
const search = ref('');
const group = useQueryFilter('group', countryGroupIds, allCountries);
const covers = computed(() =>
  [...(data.value?.passports ?? [])]
    .filter(passport => matchesCountry(passport, search.value, group.value))
    .sort((a, b) => a.name.localeCompare(b.name))
);
function resetFilters() {
  search.value = '';
  group.value = allCountries;
}
</script>

<template>
  <div>
    <PageBreadcrumbs :items="[{ label: 'Passports', to: '/passports' }, { label: 'Covers' }]" />
    <PageHeading
      eyebrow="Passports"
      title="Passport covers"
      description="The cover of every passport. Select one to see where it can travel."
    />
    <CountryFilters v-model:search="search" v-model:group="group" placeholder="Find a passport cover…" />
    <p class="my-5 text-xs text-stone-500">
      {{ covers.length }} {{ covers.length === 1 ? 'cover' : 'covers' }}
      <span v-if="search || group !== allCountries">match your filters</span>
    </p>
    <EmptyState
      v-if="error"
      title="The covers couldn’t load"
      description="Please try loading the passport covers again."
      ><button type="button" class="rounded-lg bg-emerald-900 px-4 py-2 text-sm text-white" @click="refresh()">
        Try again
      </button></EmptyState
    >
    <EmptyState v-else-if="!covers.length"
      ><button
        type="button"
        class="text-sm font-medium text-emerald-800 underline underline-offset-4"
        @click="resetFilters"
      >
        Clear filters
      </button></EmptyState
    >
    <!-- Plain links and images, as in the ranking rows, keep the 199 covers cheap to hydrate. -->
    <ul
      v-else
      class="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
      @click="followLink"
    >
      <li v-for="(passport, index) in covers" :key="passport.code">
        <a :href="passportPath(passport.code)" :aria-label="`${passport.name} passport`" class="group block">
          <img
            :src="`/covers/240/${passport.code.toLowerCase()}.webp`"
            alt=""
            width="240"
            height="360"
            :loading="index < 10 ? 'eager' : 'lazy'"
            decoding="async"
            class="h-auto w-full drop-shadow-[0_2px_4px_rgb(28_25_23/0.22)] transition-transform group-hover:-translate-y-1 motion-reduce:transform-none"
          />
          <span class="mt-2.5 block truncate text-center text-xs font-medium group-hover:text-emerald-800">{{
            passport.name
          }}</span>
        </a>
      </li>
    </ul>
    <p class="mt-10 text-xs leading-6 text-stone-500">
      The covers are recreations of the real passports.
      <NuxtLink to="/about#credits" class="text-emerald-800 underline underline-offset-4">Image credits.</NuxtLink>
    </p>
  </div>
</template>
