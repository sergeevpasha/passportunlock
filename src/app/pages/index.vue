<script setup lang="ts">
import { dateLabel } from '~/utils/entry';
const description =
  'See where each of 199 passports can travel without a visa, compare up to three passports side by side, and see how all passports rank.';
usePageSeo({ title: 'Passport Unlock · Visa requirements for 199 passports', description });
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Passport Unlock',
        url: `${useRequestURL().origin}/`,
        description,
      }),
    },
  ],
});
const route = useRoute();
// Keep previously shared comparison URLs useful after moving the comparison to its own page.
if (route.query.p1) await navigateTo({ path: '/compare', query: route.query }, { redirectCode: 301 });
const { data } = await useFetch('/api/passports');
const featured = computed(() => data.value?.passports.slice(0, 4) ?? []);
</script>

<template>
  <div>
    <section class="grid items-center gap-8 pt-1 pb-10 md:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-3 lg:pb-12">
      <div>
        <p
          v-if="data"
          class="mb-5 flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-700" /> Updated {{ dateLabel(data.sourceDate) }}
        </p>
        <h1 class="text-5xl leading-[1.04] font-medium tracking-[-0.065em] sm:text-6xl xl:text-[76px]">
          Visa requirements<br /><span class="text-emerald-800">for {{ data?.passports.length ?? 199 }} passports</span>
        </h1>
        <p class="mt-6 max-w-md text-base leading-7 text-stone-500">
          Look up the entry rule for any destination, compare up to three passports side by side, or see how all
          passports rank by visa-free destinations.
        </p>
        <div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-stone-500">
          <span class="inline-flex items-center gap-2"
            ><AppIcon name="globe" :size="16" /><strong class="font-semibold text-stone-700">198</strong> destinations
            per passport</span
          >
          <span class="inline-flex items-center gap-2"><AppIcon name="compare" :size="16" />Up to 3 side by side</span>
        </div>
      </div>
      <div
        class="relative isolate hidden h-[290px] items-center justify-center overflow-hidden rounded-3xl bg-[#edf0e6] md:flex lg:h-[350px]"
      >
        <!-- Decorative and static: never hydrated, so the map projection code doesn't load on the home page. -->
        <div class="absolute inset-0 opacity-80"><LazyWorldArtwork hydrate-never /></div>
        <div class="absolute h-65 w-65 rounded-full border border-emerald-900/10 sm:h-76 sm:w-76" />
        <div class="absolute h-44 w-44 rounded-full border border-emerald-900/10 sm:h-55 sm:w-55" />
        <div class="absolute -translate-x-13 translate-y-2 -rotate-16">
          <PassportCover tone="blue" />
        </div>
        <div class="absolute translate-x-12 -translate-y-1 rotate-12"><PassportCover /></div>
      </div>
    </section>

    <section aria-labelledby="browse-heading">
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 id="browse-heading" class="text-lg font-semibold tracking-tight">Browse the data</h2>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <NuxtLink
          to="/passports"
          class="group relative flex min-h-65 flex-col overflow-hidden rounded-2xl bg-emerald-900 p-7 text-white transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div class="mb-8 flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lime-200"
              ><AppIcon name="passport" :size="25" /></span
            ><span class="font-mono text-[11px] text-emerald-200/70">01 / PASSPORTS</span>
          </div>
          <h3 class="text-2xl font-medium tracking-tight">Passports</h3>
          <p class="mt-2 max-w-65 text-sm leading-6 text-emerald-100/70">
            Every passport with its visa-free count and rank. Select up to three to compare.
          </p>
          <div
            class="mt-7 flex items-center justify-between border-t border-white/15 pt-4 text-xs font-medium text-lime-200"
          >
            <span>Browse passports</span
            ><AppIcon
              name="arrow"
              :size="20"
              class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </NuxtLink>
        <NuxtLink
          to="/compare"
          class="group flex min-h-65 flex-col rounded-2xl border border-stone-200 bg-white p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-800/30 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div class="mb-8 flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff0e9] text-emerald-800"
              ><AppIcon name="compare" :size="25" /></span
            ><span class="font-mono text-[11px] text-stone-400">02 / COMPARE</span>
          </div>
          <h3 class="text-2xl font-medium tracking-tight">Compare</h3>
          <p class="mt-2 max-w-65 text-sm leading-6 text-stone-500">
            Up to three passports side by side: the entry rule for every destination, on a map and in a table.
          </p>
          <div
            class="mt-7 flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-medium text-emerald-800"
          >
            <span>Compare passports</span
            ><AppIcon
              name="arrow"
              :size="20"
              class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </NuxtLink>
        <NuxtLink
          to="/rankings"
          class="group flex min-h-65 flex-col rounded-2xl border border-stone-200 bg-[#eef0e5] p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-800/30 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div class="mb-8 flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-emerald-800"
              ><AppIcon name="ranking" :size="25" /></span
            ><span class="font-mono text-[11px] text-stone-400">03 / RANKING</span>
          </div>
          <h3 class="text-2xl font-medium tracking-tight">Ranking</h3>
          <p class="mt-2 max-w-65 text-sm leading-6 text-stone-500">
            Passports ordered by the number of destinations they can visit without a visa.
          </p>
          <div
            class="mt-7 flex items-center justify-between border-t border-stone-300/70 pt-4 text-xs font-medium text-emerald-800"
          >
            <span>View the ranking</span
            ><AppIcon
              name="arrow"
              :size="20"
              class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </NuxtLink>
      </div>
    </section>

    <section
      class="mt-11 grid gap-8 border-t border-stone-200 pt-8 lg:grid-cols-[1fr_2fr]"
      aria-labelledby="spotlight-heading"
    >
      <div>
        <p class="text-[10px] font-semibold tracking-[0.16em] text-stone-400 uppercase">Top of the ranking</p>
        <h2 id="spotlight-heading" class="mt-2 text-xl font-medium tracking-tight">Most visa-free destinations</h2>
        <p class="mt-2 text-xs leading-6 text-stone-500">
          The four highest-ranked passports<span v-if="data">, as of {{ dateLabel(data.sourceDate) }}</span
          >.
        </p>
      </div>
      <div v-if="featured.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NuxtLink
          v-for="passport in featured"
          :key="passport.code"
          :to="{ path: '/compare', query: { p1: passport.code.toLowerCase() } }"
          class="rounded-xl border border-stone-200/80 bg-white/70 p-4 transition-colors hover:border-emerald-700/40 hover:bg-white"
        >
          <div class="flex items-center justify-between">
            <CountryFlag :code="passport.code" :size="25" /><span class="font-mono text-[10px] text-stone-400"
              >#{{ passport.rank }}</span
            >
          </div>
          <p class="mt-3 truncate text-xs font-medium">{{ passport.name }}</p>
          <p class="mt-1 text-xl font-semibold tracking-tight">
            {{ passport.visaFree }}
            <span class="text-[10px] font-normal tracking-normal text-stone-500">visa-free</span>
          </p>
        </NuxtLink>
      </div>
      <div v-else class="self-center text-sm text-stone-500">
        The ranking couldn’t load. Reload the page to try again.
      </div>
    </section>
  </div>
</template>
