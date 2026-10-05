<script setup lang="ts">
import { countryNameInText } from '#shared/countries';
import { countryFromSegment, destinationPath, entryPath, passportPath } from '#shared/country-paths';
import { entryDescriptions } from '#shared/passports';
import { dateLabel, entryAnswer, entryClasses, entryShortLabels, siteHost, typicalRequirements } from '~/utils/entry';
import { followLink } from '~/utils/links';

const route = useRoute();
const destination = countryFromSegment(route.params.destination);
const passport = countryFromSegment(route.params.passport);
if (!destination || !passport) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
// A passport's own country has no entry rule, so that address shows the destination instead.
const redirect =
  destination.code === passport.code
    ? destinationPath(destination.code)
    : destination.canonical && passport.canonical
      ? undefined
      : entryPath(destination.code, passport.code);
if (redirect) await navigateTo(redirect, { redirectCode: 301 });
const { data, error, refresh } = await useFetch('/api/visa', {
  query: { passport: passport.code.toLowerCase(), destination: destination.code.toLowerCase() },
});
const passportName = computed(() => data.value?.passport.name ?? passport.code);
const destinationName = computed(() => data.value?.destination.name ?? destination.code);
const destinationInText = computed(() => countryNameInText(destination.code, destinationName.value));
const passportInText = computed(() => countryNameInText(passport.code, passportName.value));
const answer = computed(() =>
  entryAnswer(data.value?.rule ?? { status: 'unknown' }, passportName.value, destinationInText.value)
);
const regionInText = computed(() => (data.value?.region === 'Americas' ? 'the Americas' : data.value?.region));
const officialSiteLabel = computed(() => {
  const status = data.value?.rule.status;
  return `Official ${status === 'eta' ? 'eTA' : status === 'e-visa' ? 'eVisa' : 'visa'} site`;
});
// The rule's own official site, or else the destination's page about visas.
const officialLink = computed(() => {
  if (data.value?.officialSite) return { url: data.value.officialSite.url, label: officialSiteLabel.value };
  if (data.value?.visaPage) return { url: data.value.visaPage, label: 'Official visa information' };
  return undefined;
});
// The same for every destination, so it is labelled as typical.
const typical = computed(() => typicalRequirements[data.value?.rule.status ?? 'unknown'] ?? []);
const requirementsHeading = computed(() => {
  switch (data.value?.rule.status) {
    case 'visa free':
      return 'Entry conditions';
    case 'eta':
      return 'eTA requirements';
    case 'no admission':
      return 'Entry restrictions';
    default:
      return 'Visa requirements';
  }
});

usePageSeo({
  title: () =>
    `Do ${passportName.value} passport holders need a visa for ${destinationInText.value}? · Passport Unlock`,
  description: () =>
    data.value ? `${answer.value.text} Updated ${dateLabel(data.value.sourceDate, 'long')}.` : answer.value.text,
});
// Without a confirmed rule the page has nothing to answer with, so it stays out of search results.
useSeoMeta({ robots: () => (data.value?.rule.status === 'unknown' ? 'noindex' : undefined) });
</script>

<template>
  <div>
    <PageBreadcrumbs
      :items="[
        { label: 'Destinations', to: '/destinations' },
        { label: destinationName, to: destinationPath(destination.code) },
        { label: `${passportName} passport` },
      ]"
    />
    <EmptyState v-if="error" title="This rule couldn’t load" description="Try again, or check another trip."
      ><div class="flex justify-center gap-5">
        <button type="button" class="text-sm text-emerald-800 underline" @click="refresh()">Try again</button
        ><NuxtLink :to="destinationPath(destination.code)" class="text-sm text-emerald-800 underline"
          >Every passport for {{ destinationName }}</NuxtLink
        >
      </div></EmptyState
    >
    <template v-else-if="data">
      <div class="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-12">
        <div>
          <p class="mb-3 text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase">Entry rules</p>
          <h1 class="text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-5xl">
            Do {{ passportName }} passport holders need a visa for {{ destinationInText }}?
          </h1>
          <div class="mt-6"><DataNote :date="data.sourceDate" /></div>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <div class="flex items-center gap-3 text-stone-400">
            <CountryFlag :code="passport.code" :size="32" eager /><AppIcon name="arrow" :size="18" /><CountryFlag
              :code="destination.code"
              :size="32"
              eager
            />
          </div>
          <p class="mt-6 text-3xl font-medium tracking-tight">{{ answer.title }}</p>
          <div class="mt-4"><EntryStatus :rule="data.rule" /></div>
          <p class="mt-4 text-sm leading-7 text-stone-700">{{ answer.text }}</p>
          <p class="mt-5 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500">
            {{ entryDescriptions[data.rule.status] }}
          </p>
        </div>
      </div>
      <section
        v-if="data.notes.length || officialLink || typical.length"
        class="mt-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8"
        aria-labelledby="requirements-heading"
      >
        <h2 id="requirements-heading" class="text-xl font-semibold tracking-tight">{{ requirementsHeading }}</h2>
        <p class="mt-2 text-sm leading-7 text-stone-500">
          For {{ passportName }} passport holders visiting {{ destinationInText }}.
        </p>
        <template v-if="officialLink">
          <a
            :href="officialLink.url"
            class="group mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-800/15 bg-emerald-50/60 px-5 py-4 transition-colors hover:border-emerald-800/40 motion-reduce:transition-none"
          >
            <span class="min-w-0">
              <span class="block text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">{{
                officialLink.label
              }}</span>
              <span class="mt-1 block text-base font-medium break-words">{{ siteHost(officialLink.url) }}</span>
            </span>
            <AppIcon
              name="diagonal"
              :size="18"
              class="text-emerald-800 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            />
          </a>
          <p class="mt-2 text-xs leading-6 text-stone-500">
            The official site for visitors to {{ destinationInText }}. Agency sites with similar names charge extra
            fees.
          </p>
        </template>
        <ul v-if="data.notes.length" class="mt-6 space-y-3">
          <li v-for="note in data.notes" :key="note" class="flex gap-3 text-sm leading-7 text-stone-700">
            <span class="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />{{ note }}
          </li>
        </ul>
        <template v-if="typical.length">
          <h3 class="mt-8 text-sm font-semibold">What you’ll usually need</h3>
          <ul class="mt-3 space-y-2">
            <li v-for="item in typical" :key="item" class="flex gap-3 text-sm leading-7 text-stone-700">
              <AppIcon name="check" :size="16" class="mt-1.5 text-stone-400" />{{ item }}
            </li>
          </ul>
          <p class="mt-3 text-xs leading-6 text-stone-500">
            Typical for this kind of {{ data.rule.status === 'eta' ? 'approval' : 'visa' }}, not specific to
            {{ destinationInText }}. The official site or an embassy has the exact list.
          </p>
        </template>
        <p class="mt-6 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500">
          Requirements change, and some depend on where you live, the visas you already hold or your route. Confirm them
          with the official site or an embassy before you travel.
        </p>
      </section>
      <section class="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="check-heading">
        <h2 id="check-heading" class="mb-4 text-sm font-semibold">Check another trip</h2>
        <VisaChecker
          :passport="{ code: passport.code, name: passportName }"
          :destination="{ code: destination.code, name: destinationName }"
        />
      </section>
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <NuxtLink
          :to="destinationPath(destination.code)"
          class="group flex flex-col rounded-2xl border border-stone-200 bg-[#eef0e5] p-6 transition-colors hover:border-emerald-800/30 motion-reduce:transition-none"
        >
          <span class="flex items-center gap-2 text-xs font-medium text-stone-600"
            ><CountryFlag :code="destination.code" :size="18" />{{ destinationName }}</span
          >
          <span class="mt-4 text-3xl font-medium tracking-tight"
            >{{ data.destination.visaFree
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-600"
              >of {{ data.destination.total }} passports visa-free</span
            ></span
          >
          <span class="mt-2 text-xs text-stone-600">Rank {{ data.destination.rank }} among destinations</span>
          <span class="mt-auto pt-6"
            ><span
              class="flex items-center justify-between border-t border-stone-300/70 pt-4 text-xs font-medium text-emerald-800"
              >Every passport’s rule<AppIcon
                name="arrow"
                :size="18"
                class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span
          ></span>
        </NuxtLink>
        <NuxtLink
          :to="passportPath(passport.code)"
          class="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-emerald-800/30 motion-reduce:transition-none"
        >
          <span class="flex items-center gap-2 text-xs font-medium text-stone-600"
            ><CountryFlag :code="passport.code" :size="18" />{{ passportName }} passport</span
          >
          <span class="mt-4 text-3xl font-medium tracking-tight"
            >{{ data.passport.visaFree
            }}<span class="ml-2 text-xs font-normal tracking-normal text-stone-500"
              >of {{ data.passport.total }} destinations visa-free</span
            ></span
          >
          <span class="mt-2 text-xs text-stone-500">Rank {{ data.passport.rank }} among passports</span>
          <span class="mt-auto pt-6"
            ><span
              class="flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-medium text-emerald-800"
              >Every destination for this passport<AppIcon
                name="arrow"
                :size="18"
                class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span
          ></span>
        </NuxtLink>
        <NuxtLink
          :to="entryPath(passport.code, destination.code)"
          class="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-emerald-800/30 motion-reduce:transition-none"
        >
          <span class="text-xs font-medium text-stone-600">The other way</span>
          <span class="mt-4 text-sm leading-6"
            >{{ destinationName }} passport holders visiting {{ passportInText }}</span
          >
          <span class="mt-3"><EntryStatus :rule="data.reverse" /></span>
          <span class="mt-auto pt-6"
            ><span
              class="flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-medium text-emerald-800"
              >See that rule<AppIcon
                name="arrow"
                :size="18"
                class="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span
          ></span>
        </NuxtLink>
      </div>
      <section v-if="data.nearby.length" class="mt-11" aria-labelledby="nearby-heading">
        <h2 id="nearby-heading" class="text-xl font-semibold tracking-tight">
          More of {{ regionInText }} for {{ passportName }} passport holders
        </h2>
        <!-- Plain links keep these rows cheap to hydrate; the one listener keeps their clicks in the app. -->
        <ul class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" @click="followLink">
          <li v-for="item in data.nearby" :key="item.code">
            <a
              :href="entryPath(item.code, passport.code)"
              class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-emerald-700/40 motion-reduce:transition-none"
              ><img
                :src="`/flags/1x1/${item.code.toLowerCase()}.svg`"
                alt=""
                width="22"
                height="22"
                loading="lazy"
                decoding="async"
                class="inline-block shrink-0 rounded-full bg-stone-100 object-cover ring-1 ring-black/5" /><span
                class="flex-1 truncate text-sm font-medium"
                >{{ item.name }}</span
              ><span
                class="rounded-md px-2 py-1 text-[10px] font-medium whitespace-nowrap"
                :class="entryClasses[item.rule.status]"
                >{{ entryShortLabels[item.rule.status] }}</span
              ><span v-if="item.rule.days" class="w-12 text-right text-[10px] whitespace-nowrap text-stone-500"
                >{{ item.rule.days }} days</span
              ><span v-else class="w-12"
            /></a>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
