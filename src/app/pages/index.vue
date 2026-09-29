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
// The world map behind the passports only decorates wide screens, so it is drawn in the browser there and phones never
// load it.
const wide = ref(false);
let media: MediaQueryList | undefined;
const onMediaChange = (event: MediaQueryListEvent) => {
  wide.value = event.matches;
};
onMounted(() => {
  media = window.matchMedia('(min-width: 48rem)');
  wide.value = media.matches;
  media.addEventListener('change', onMediaChange);
});
onBeforeUnmount(() => media?.removeEventListener('change', onMediaChange));
</script>

<template>
  <div>
    <section class="grid items-center gap-8 pt-1 pb-10 md:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-3 lg:pb-12">
      <div>
        <p v-if="data" class="eyebrow mb-5 flex items-center gap-2.5 text-emerald-800">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-700" /> Updated {{ dateLabel(data.sourceDate) }}
        </p>
        <h1 class="text-[2.625rem] leading-[1.04] font-medium tracking-tighter sm:text-6xl xl:text-7xl">
          Visa requirements<br /><span class="text-emerald-800">for {{ data?.passports.length ?? 199 }} passports</span>
        </h1>
        <p class="mt-6 max-w-md text-base leading-7 text-stone-600">
          Look up the entry rule for any destination, compare up to three passports side by side, or see how all
          passports rank by visa-free destinations.
        </p>
        <PassportSearch v-if="data" :passports="data.passports" class="mt-8 max-w-md" />
        <div class="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <NuxtLink to="/compare" class="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-600"
            >Compare passports<AppIcon name="arrow" :size="16"
          /></NuxtLink>
          <NuxtLink to="/passports" class="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-600"
            >See the ranking<AppIcon name="arrow" :size="16"
          /></NuxtLink>
        </div>
      </div>
      <div
        aria-hidden="true"
        class="relative isolate hidden h-[290px] items-center justify-center overflow-hidden rounded-3xl bg-panel md:flex lg:h-[350px]"
      >
        <Transition
          enter-from-class="opacity-0"
          enter-active-class="transition-opacity duration-500 motion-reduce:transition-none"
        >
          <div v-if="wide" class="absolute inset-0 opacity-80"><LazyWorldArtwork /></div>
        </Transition>
        <div class="absolute h-65 w-65 rounded-full border border-emerald-900/10 sm:h-76 sm:w-76" />
        <div class="absolute h-44 w-44 rounded-full border border-emerald-900/10 sm:h-55 sm:w-55" />
        <div class="absolute -translate-x-13 translate-y-2 -rotate-16">
          <PassportCover tone="blue" />
        </div>
        <div class="absolute translate-x-12 -translate-y-1 rotate-12"><PassportCover /></div>
      </div>
    </section>

    <section
      class="mt-4 grid gap-8 border-t border-stone-200 pt-8 lg:grid-cols-[1fr_2fr]"
      aria-labelledby="spotlight-heading"
    >
      <div>
        <p class="eyebrow text-stone-600">Top of the ranking</p>
        <h2 id="spotlight-heading" class="mt-2 text-xl font-medium tracking-tight">Most visa-free destinations</h2>
        <p class="mt-2 text-sm leading-6 text-stone-600">
          The four highest-ranked passports<span v-if="data">, as of {{ dateLabel(data.sourceDate) }}</span
          >.
        </p>
        <NuxtLink
          to="/passports"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-600"
          >All passports<AppIcon name="arrow" :size="16"
        /></NuxtLink>
      </div>
      <div v-if="featured.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NuxtLink
          v-for="passport in featured"
          :key="passport.code"
          :to="{ path: '/compare', query: { p1: passport.code.toLowerCase() } }"
          class="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-emerald-700/40"
        >
          <div class="flex items-center justify-between">
            <CountryFlag :code="passport.code" :size="28" /><span class="text-xs font-medium text-stone-600"
              >#{{ passport.rank }}</span
            >
          </div>
          <p class="mt-3 truncate text-sm font-medium">{{ passport.name }}</p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">
            {{ passport.visaFree }}
            <span class="text-xs font-normal tracking-normal text-stone-600">visa-free</span>
          </p>
        </NuxtLink>
      </div>
      <div v-else class="self-center text-sm text-stone-600">
        The ranking couldn’t load. Reload the page to try again.
      </div>
    </section>
  </div>
</template>
