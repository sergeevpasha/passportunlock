<script setup lang="ts">
import { countryGroups } from '#shared/countries';
import { entryDescriptions, requirementTypes } from '#shared/passports';
import { coverCredits, coverLicenses } from '~/utils/cover-credits';
import { dateLabel } from '~/utils/entry';
usePageSeo({
  title: 'About the data · Passport Unlock',
  description:
    'What each entry type means, how passports and destinations are scored and compared, and what to check before you travel.',
});
const { data } = await useFetch('/api/passports');
const types = [...requirementTypes, 'domestic', 'unknown'] as const;
const groups = countryGroups.filter(group => group.kind === 'Groups');
const covers = computed(() =>
  Object.entries(coverCredits)
    .map(([code, credit]) => ({
      ...credit,
      code,
      country: data.value?.passports.find(passport => passport.code === code)?.name ?? code,
      licenseUrl: coverLicenses[credit.license],
    }))
    .sort((a, b) => a.country.localeCompare(b.country))
);
</script>

<template>
  <article class="mx-auto max-w-4xl">
    <PageHeading
      eyebrow="About"
      title="About the data"
      description="What each entry type means, how passports are scored, and what to check before you travel."
    />
    <div class="rounded-2xl bg-emerald-900 p-6 text-white sm:p-8">
      <div class="flex items-center gap-3">
        <AppIcon name="info" :size="22" class="text-lime-200" />
        <h2 class="text-xl font-medium">Check before you travel</h2>
      </div>
      <p class="mt-4 text-sm leading-7 text-emerald-100/80">
        Entry rules change, and your residence, existing visas, travel dates, transit and reason for travel can all
        affect entry. Confirm current rules with the destination’s immigration authority or embassy before booking.
      </p>
    </div>
    <section class="mt-9 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Dates</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        The rules were last updated<span v-if="data"> on {{ dateLabel(data.sourceDate, 'long') }}</span
        >. That is when the data was updated, not when a rule was last officially confirmed. Each comparison column
        shows the date of its data.
      </p>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        A few rules are missing, mostly for Palestine, Kosovo, Macau, Hong Kong and Taiwan. They show as “Not confirmed”
        and don’t count toward any score.
      </p>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Entry types</h2>
      <dl class="mt-4 divide-y divide-stone-100">
        <div v-for="type in types" :key="type" class="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt><EntryStatus :rule="{ status: type }" /></dt>
          <dd class="text-sm leading-7 text-stone-500">{{ entryDescriptions[type] }}</dd>
        </div>
      </dl>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">How passports are scored</h2>
      <div class="mt-5 grid gap-6 text-sm leading-7 text-stone-500 sm:grid-cols-2">
        <div>
          <h3 class="font-semibold text-stone-800">The global ranking</h3>
          <p class="mt-2">
            Only destinations marked visa-free count toward the score. Visas on arrival, eTAs, eVisas, and the
            passport’s home country are excluded. The dataset covers 199 passports and 198 international destinations
            per passport.
          </p>
          <p class="mt-3">
            Equal scores share a rank. If two passports tie at #1, the next rank is #3. Filters keep the global rank.
          </p>
          <p class="mt-3">
            The ranking can switch to a mobility score, which also counts visas on arrival and eTAs: every destination
            that needs no visa arranged before travel. Broader indexes count this way too, but the Passport Index also
            counts eVisas issued within three days, which this data doesn’t tell apart, so its scores still differ.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-stone-800">Comparing and combining</h3>
          <p class="mt-2">
            Shared access means all selected passports are visa-free. Combined access means at least one is. Additional
            access counts destinations beyond the first passport’s visa-free list. All selected home countries are
            excluded from these totals.
          </p>
          <p class="mt-3">
            Mixed-date comparisons are illustrative. Missing stay durations do not mean unlimited entry. Regional
            allowances may be shared across destinations.
          </p>
        </div>
      </div>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Destinations</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        Each destination’s page lists the rule for all 198 other passports, and each passport has a page for every
        destination. Destinations are ranked by the number of passports they let in without a visa or, with the mobility
        score, without a visa arranged before travel. A rule that isn’t confirmed doesn’t count, so a destination
        missing from some passports’ rules ranks lower than it might.
      </p>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Regions and groups</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        Lists can be narrowed to a region or to one of these groups. They count full members as of September 2026:
        Cyprus hasn’t joined the Schengen Area yet, Venezuela is suspended from Mercosur, and Saudi Arabia, invited to
        join BRICS from 2024, hasn’t confirmed that it did.
      </p>
      <ul class="mt-5 flex flex-wrap gap-2">
        <li v-for="group in groups" :key="group.id">
          <NuxtLink
            :to="{ path: '/rankings', query: { group: group.id } }"
            class="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs hover:border-emerald-700"
            >{{ group.label }}<span class="text-stone-500">{{ group.codes.size }}</span></NuxtLink
          >
        </li>
      </ul>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">How entry types are assigned</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        A destination that needs no visa but does need an electronic travel authorisation (ESTA, eTA, ETA, NZeTA, K-ETA
        and similar) counts as an eTA, so the visa-free score only includes destinations that need no approval before
        travel. Where both an eVisa and a visa on arrival are available, the visa on arrival is shown.
      </p>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        Rules are not equally detailed for every passport: one may note an authorisation that another leaves out. Check
        the destination’s official site for the trip you plan.
      </p>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">How updates are handled</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        Each update is checked before it goes live. It is held back for review when a passport’s rules are missing or
        incomplete, when more than 2% of rules are missing, or when more than 5% of rules change at once. An accepted
        update replaces the data in one step, and the previous version is kept.
      </p>
    </section>
    <section id="credits" class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Credits</h2>
      <p class="mt-3 text-sm leading-7 text-stone-500">
        Visa rules are adapted from the
        <a
          href="https://en.wikipedia.org/wiki/Category:Visa_requirements_by_nationality"
          class="text-emerald-800 underline underline-offset-4"
          >“Visa requirements for … citizens”</a
        >
        articles by Wikipedia contributors, licensed under
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="text-emerald-800 underline underline-offset-4"
          >CC BY-SA 4.0</a
        >. The adapted data, including the CSV export and the API, is shared under the same licence. Passport Unlock is
        independent and not endorsed by the Wikimedia Foundation.
      </p>
      <p class="mt-4 text-sm leading-7 text-stone-500">
        Map geometry:
        <a href="/licenses/d3-maps-atlas.txt" class="text-emerald-800 underline underline-offset-4">D3 Maps Atlas</a>.
        Flags: <a href="/licenses/flag-icons.txt" class="text-emerald-800 underline underline-offset-4">flag-icons</a>.
      </p>
      <p class="mt-4 text-sm leading-7 text-stone-500">
        Passport cover images are recreations based on photographs and scans of each passport. Those adapted from the
        works below are shared under the same licence as the work they adapt.
      </p>
      <details id="cover-credits" class="mt-3">
        <summary class="cursor-pointer text-sm font-medium text-emerald-800">Cover image credits</summary>
        <ul class="mt-3 grid gap-x-8 gap-y-2 text-xs leading-5 text-stone-500 sm:grid-cols-2">
          <li v-for="cover in covers" :key="cover.code">
            {{ cover.country }}:
            <a :href="cover.url" class="text-emerald-800 underline underline-offset-4">{{ cover.title }}</a> by
            {{ cover.author }},
            <a :href="cover.licenseUrl" class="whitespace-nowrap text-emerald-800 underline underline-offset-4">{{
              cover.license
            }}</a>
          </li>
        </ul>
      </details>
    </section>
  </article>
</template>
