<script setup lang="ts">
import type { EntryRule, EntryType } from '#shared/passports';
const props = defineProps<{
  /** A passport's or a destination's rule for each country, linking to the page for that pair. */
  rows: {
    code: string;
    code3: string;
    name: string;
    region: string;
    rule: EntryRule;
    href: string;
    linkLabel: string;
  }[];
  /** The heading over each entry type's list. */
  headings: Record<EntryType, string>;
  /** What a row stands for: "Destination" or "Passport". */
  column: string;
  caption: string;
}>();

// The easiest way in first, so "visa-free countries" is the first list on the page, as people search for it.
const order: EntryType[] = [
  'visa free',
  'visa on arrival',
  'eta',
  'e-visa',
  'visa required',
  'no admission',
  'unknown',
];
const groups = computed(() =>
  order
    .map(status => ({
      status,
      id: `entry-${status.replace(/\s/g, '-')}`,
      rows: props.rows.filter(row => row.rule.status === status),
    }))
    .filter(group => group.rows.length)
);
</script>

<template>
  <div class="space-y-8">
    <section v-for="group in groups" :key="group.status" :aria-labelledby="group.id">
      <h3 :id="group.id" class="mb-3 text-base font-semibold tracking-tight">
        {{ headings[group.status] }} <span class="font-normal text-stone-500">({{ group.rows.length }})</span>
      </h3>
      <div class="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            {{
              caption
            }}:
            {{
              headings[group.status]
            }}
          </caption>
          <thead class="sr-only">
            <tr>
              <th scope="col">{{ column }}</th>
              <th scope="col">Region</th>
              <th scope="col">Entry rule</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <!-- Each list's linked rows hydrate once they scroll into view, like the ranking rows. -->
          <LazyEntryRows :rows="group.rows" hydrate-on-visible />
        </table>
      </div>
    </section>
  </div>
</template>
