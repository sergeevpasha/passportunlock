<script setup lang="ts">
import { countryNameInText } from '#shared/countries';
import { countryFromSegment, destinationPath, entryPath, passportPath } from '#shared/country-paths';
import { nationality } from '#shared/nationalities';
import { entryDescriptions, entryLabels, type EntryRule } from '#shared/passports';
import {
  dateLabel,
  entryAnswer,
  entryClasses,
  entryHeadline,
  entryShortLabels,
  exceptionLine,
  possessive,
  siteHost,
  typicalRequirements,
  validityLabel,
} from '~/utils/entry';
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
// Searchers name the passport's holders by nationality, "German citizens", not "Germany passport holders".
const citizens = computed(() => `${nationality(passport.code)} citizens`);
const scheme = computed(() => data.value?.authorisation?.name ?? 'eTA');
const rule = computed<EntryRule>(() => data.value?.rule ?? { status: 'unknown' });
const answer = computed(() => entryAnswer(rule.value, citizens.value, destinationInText.value, scheme.value));
const regionInText = computed(() => (data.value?.region === 'Americas' ? 'the Americas' : data.value?.region));
const officialSiteLabel = computed(() => {
  const status = rule.value.status;
  return `Official ${status === 'eta' ? scheme.value : status === 'e-visa' ? 'eVisa' : 'visa'} site`;
});
// The rule's own official site, or else the destination's page about visas.
const officialLink = computed(() => {
  if (data.value?.officialSite) return { url: data.value.officialSite.url, label: officialSiteLabel.value };
  if (data.value?.visaPage) return { url: data.value.visaPage, label: 'Official visa information' };
  return undefined;
});
// The same for every destination, so it is labelled as typical.
const typical = computed(() => typicalRequirements[rule.value.status] ?? []);
// What every visitor needs, from the destination's own policy, and the authorisation's full name.
const facts = computed(() => {
  const list: { label: string; text: string }[] = [];
  if (data.value?.authorisation) list.push({ label: 'Authorisation', text: data.value.authorisation.full });
  if (data.value?.facts?.passportValidity)
    list.push({ label: 'Passport', text: validityLabel(data.value.facts.passportValidity) });
  if (data.value?.facts?.arrivalCard)
    list.push({ label: 'Arrival card', text: `${data.value.facts.arrivalCard}, filed online before arrival` });
  return list;
});
const requirementsHeading = computed(() => {
  switch (rule.value.status) {
    case 'visa free':
      return 'Entry conditions';
    case 'eta':
      return `${scheme.value} requirements`;
    case 'no admission':
      return 'Entry restrictions';
    default:
      return 'Visa requirements';
  }
});
const ruleLabel = (item: EntryRule) => `${entryLabels[item.status]}${item.days ? `, ${item.days} days` : ''}`;
const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

usePageSeo({
  title: () => entryHeadline(rule.value, nationality(passport.code), destinationName.value, scheme.value),
  description: () => {
    if (!data.value) return answer.value.text;
    const short =
      rule.value.status === 'eta'
        ? `No visa, but ${citizens.value} need an approved ${scheme.value} before they travel to ${destinationInText.value}${rule.value.days ? `, for stays of up to ${rule.value.days} days` : ''}.`
        : answer.value.text;
    const covers = [
      data.value.exceptions.length && 'exceptions for visa holders',
      data.value.facts?.passportValidity && 'passport validity',
      data.value.notes.some(note => note.label === 'Fee') && 'fees',
      officialLink.value && 'the official site',
    ].filter(Boolean) as string[];
    return `${short}${covers.length ? ` Plus ${new Intl.ListFormat('en').format(covers)}.` : ''} Checked ${dateLabel(data.value.sourceDate, 'long')}.`;
  },
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
            Do {{ citizens }} need a visa for {{ destinationInText }}?
          </h1>
          <div class="mt-6 space-y-2">
            <DataNote :date="data.sourceDate" />
            <p
              v-if="data.check?.result === 'confirmed' || data.check?.result === 'corrected'"
              class="flex items-center gap-2 text-xs leading-6 text-emerald-800"
            >
              <AppIcon name="check" :size="14" />{{
                data.check.result === 'confirmed'
                  ? `Checked against ${possessive(destinationInText)} visa policy`
                  : `Updated from ${possessive(destinationInText)} visa policy`
              }}
            </p>
            <p v-if="data.changed" class="text-xs leading-6 text-stone-500">
              Our rule changed on {{ dateLabel(data.changed.on) }}. Before that: {{ ruleLabel(data.changed.was) }}.
            </p>
          </div>
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
          <div v-if="data.exceptions.length" class="mt-4 rounded-xl bg-emerald-50/70 px-4 py-3">
            <p class="text-[10px] font-semibold tracking-[0.14em] text-emerald-800 uppercase">Exceptions</p>
            <ul class="mt-1 space-y-1">
              <li
                v-for="exception in data.exceptions"
                :key="exceptionLine(exception)"
                class="text-sm leading-6 text-stone-700"
              >
                {{ exceptionLine(exception) }}
              </li>
            </ul>
            <p class="mt-1 text-xs leading-6 text-stone-500">Conditions apply: see the notes below.</p>
          </div>
          <!-- Another account of the destination's policy disagrees, and nobody has checked which is right yet. -->
          <div
            v-if="data.check?.result === 'differs' && data.check.rule.status !== data.rule.status"
            class="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900"
            role="note"
          >
            {{ capitalized(possessive(destinationInText)) }} visa policy lists this differently:
            {{ ruleLabel(data.check.rule) }}. Check the official site before you travel.
          </div>
          <p
            v-else-if="data.check?.result === 'differs'"
            class="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-xs leading-6 text-stone-600"
            role="note"
          >
            {{ capitalized(possessive(destinationInText)) }} visa policy gives a different stay: up to
            {{ data.check.rule.days }} days. Check it before you plan a long stay.
          </p>
          <p class="mt-5 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500">
            {{ entryDescriptions[data.rule.status] }}
          </p>
        </div>
      </div>
      <section
        v-if="data.notes.length || officialLink || typical.length || facts.length"
        class="mt-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8"
        aria-labelledby="requirements-heading"
      >
        <h2 id="requirements-heading" class="text-xl font-semibold tracking-tight">{{ requirementsHeading }}</h2>
        <p class="mt-2 text-sm leading-7 text-stone-500">For {{ citizens }} visiting {{ destinationInText }}.</p>
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
        <dl v-if="facts.length" class="mt-6 grid gap-3 sm:grid-cols-2">
          <div v-for="fact in facts" :key="fact.label" class="rounded-xl bg-stone-50 px-4 py-3">
            <dt class="text-[10px] font-semibold tracking-[0.14em] text-stone-500 uppercase">{{ fact.label }}</dt>
            <dd class="mt-1 text-sm leading-6 text-stone-800">{{ fact.text }}</dd>
          </div>
        </dl>
        <ul v-if="data.notes.length" class="mt-6 space-y-3">
          <li v-for="note in data.notes" :key="note.text" class="flex gap-3 text-sm leading-7 text-stone-700">
            <span class="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" /><span
              ><span
                v-if="note.label"
                class="mr-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-stone-600 uppercase"
                >{{ note.label }}</span
              >{{ note.text }}</span
            >
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
            Typical for this kind of {{ rule.status === 'eta' ? 'approval' : 'visa' }}, not specific to
            {{ destinationInText }}. The official site or an embassy has the exact list.
          </p>
        </template>
        <p class="mt-6 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500">
          The rule depends on the passport you travel on, not the country you fly from. Requirements change, and some
          depend on where you live, the visas you already hold or your route. Confirm them with the official site or an
          embassy before you travel.
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
              >{{ destinationName }} visa requirements for every passport<AppIcon
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
              >Where else {{ citizens }} can go visa-free<AppIcon
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
            >{{ nationality(destination.code) }} citizens visiting {{ passportInText }}</span
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
          More of {{ regionInText }} for {{ citizens }}
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
