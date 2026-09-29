<script setup lang="ts">
import type { NuxtError } from '#app';
const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
const route = useRoute();
useSeoMeta({
  title: () => `${notFound.value ? 'Page not found' : 'Something went wrong'} · Passport Unlock`,
  robots: 'noindex',
});
const pages = [
  { to: '/passports', label: 'Passports', description: 'Every passport with its visa-free count and rank.' },
  { to: '/compare', label: 'Compare', description: 'Up to three passports side by side.' },
  { to: '/rankings', label: 'Ranking', description: 'Passports ordered by visa-free destinations.' },
];
const retry = () => reloadNuxtApp({ path: route.fullPath });
const goHome = () => clearError({ redirect: '/' });
</script>

<template>
  <NuxtLayout>
    <div class="mx-auto max-w-3xl py-6 text-center sm:py-12">
      <p class="font-mono text-xs tracking-[0.18em] text-emerald-800">{{ error.statusCode }}</p>
      <h1 class="mt-3 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-5xl">
        {{ notFound ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-sm leading-7 text-stone-500 sm:text-base">
        <template v-if="notFound"
          >There is no page at
          <code class="rounded bg-stone-100 px-1.5 py-0.5 text-[0.9em] text-stone-700">{{ route.path }}</code
          >. Check the address, or go to one of the pages below.</template
        >
        <template v-else>This page couldn’t load. Try again, or go to one of the pages below.</template>
      </p>
      <p v-if="!notFound && error.message" class="mt-2 text-xs text-stone-500">{{ error.message }}</p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <button
          v-if="!notFound"
          type="button"
          class="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-emerald-800"
          @click="retry"
        >
          Try again
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          @click="goHome"
        >
          Go to the homepage
        </button>
      </div>
      <ul class="mt-12 grid gap-3 text-left sm:grid-cols-3">
        <li v-for="page in pages" :key="page.to">
          <NuxtLink
            :to="page.to"
            class="flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-emerald-700/40 motion-reduce:transition-none"
            ><span class="flex items-center justify-between text-sm font-semibold"
              >{{ page.label }}<AppIcon name="arrow" :size="16" class="text-emerald-800" /></span
            ><span class="mt-1 text-xs leading-5 text-stone-500">{{ page.description }}</span></NuxtLink
          >
        </li>
      </ul>
    </div>
  </NuxtLayout>
</template>
