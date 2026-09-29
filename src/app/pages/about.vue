<script setup lang="ts">
import { entryDescriptions, requirementTypes } from '#shared/passports';
import { dateLabel } from '~/utils/entry';
usePageSeo({
  title: 'About the data · Passport Unlock',
  description:
    'What each entry type means, how passports are scored and compared, and what to check before you travel.',
});
const { data } = await useFetch('/api/passports');
const types = [...requirementTypes, 'domestic', 'unknown'] as const;
</script>

<template>
  <article class="mx-auto max-w-4xl">
    <PageHeading
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
      <p class="mt-3 text-sm leading-7 text-stone-600">
        The rules were last updated<span v-if="data"> on {{ dateLabel(data.sourceDate, 'long') }}</span
        >. That is when the data was updated, not when a rule was last officially confirmed. Each comparison column
        shows the date of its data.
      </p>
      <p class="mt-3 text-sm leading-7 text-stone-600">
        A few rules are missing, mostly for Palestine, Kosovo, Macau, Hong Kong and Taiwan. They show as “Not confirmed”
        and don’t count toward any score.
      </p>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Entry types</h2>
      <dl class="mt-4 divide-y divide-stone-100">
        <div v-for="type in types" :key="type" class="grid gap-2 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt><EntryStatus :rule="{ status: type }" /></dt>
          <dd class="text-sm leading-7 text-stone-600">{{ entryDescriptions[type] }}</dd>
        </div>
      </dl>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">How passports are scored</h2>
      <div class="mt-5 grid gap-6 text-sm leading-7 text-stone-600 sm:grid-cols-2">
        <div>
          <h3 class="font-semibold text-stone-800">The global ranking</h3>
          <p class="mt-2">
            Only destinations marked visa-free count toward the score. Visas on arrival, eTAs, eVisas, and the
            passport’s home country are excluded. The dataset covers 199 passports and 198 international destinations
            per passport.
          </p>
          <p class="mt-3">
            Equal scores share a rank. If two passports tie at #1, the next rank is #3. Regional filters retain the
            global rank. This differs from broader mobility scores such as the Passport Index.
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
      <h2 class="text-xl font-semibold tracking-tight">How entry types are assigned</h2>
      <p class="mt-3 text-sm leading-7 text-stone-600">
        A destination that needs no visa but does need an electronic travel authorisation (ESTA, eTA, ETA, NZeTA, K-ETA
        and similar) counts as an eTA, so the visa-free score only includes destinations that need no approval before
        travel. Where both an eVisa and a visa on arrival are available, the visa on arrival is shown.
      </p>
      <p class="mt-3 text-sm leading-7 text-stone-600">
        Rules are not equally detailed for every passport: one may note an authorisation that another leaves out. Check
        the destination’s official site for the trip you plan.
      </p>
    </section>
    <section class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">How updates are handled</h2>
      <p class="mt-3 text-sm leading-7 text-stone-600">
        Each update is checked before it goes live. It is held back for review when a passport’s rules are missing or
        incomplete, when more than 2% of rules are missing, or when more than 5% of rules change at once. An accepted
        update replaces the data in one step, and the previous version is kept.
      </p>
    </section>
    <section id="credits" class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold tracking-tight">Credits</h2>
      <p class="mt-3 text-sm leading-7 text-stone-600">
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
      <p class="mt-4 text-sm leading-7 text-stone-600">
        Map geometry:
        <a href="/licenses/d3-maps-atlas.txt" class="text-emerald-800 underline underline-offset-4">D3 Maps Atlas</a>.
        Flags: <a href="/licenses/flag-icons.txt" class="text-emerald-800 underline underline-offset-4">flag-icons</a>.
      </p>
    </section>
  </article>
</template>
