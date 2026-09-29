<script setup lang="ts">
import { easiestRules, type EntryRule } from '#shared/passports';
import { dateLabel } from '~/utils/entry';
const props = defineProps<{
  rows: { code: string; name: string; rules: EntryRule[] }[];
  columns: { code: string; name: string; snapshot: { sourceDate: string } }[];
}>();
const id = useId();
// Every column fits the screen, so nothing scrolls sideways. On a phone, a comparison puts each destination's name on
// its own line above its rules, which then get the full width.
const stacked = computed(() => props.columns.length > 1);
const destinationWidth = computed(() => ['w-1/2 sm:w-2/5', 'sm:w-1/3', 'sm:w-1/4'][props.columns.length - 1] ?? '');
const mixedDates = computed(() => new Set(props.columns.map(column => column.snapshot.sourceDate)).size > 1);
// Where the passports differ, the easiest rule is highlighted; its stay is bold when that is what sets it apart.
const marks = computed(
  () =>
    new Map(
      props.rows.map(row => {
        const easiest = stacked.value ? easiestRules(row.rules) : [];
        const status = row.rules[easiest[0] ?? -1]?.status;
        const byStay = row.rules.some((rule, index) => !easiest.includes(index) && rule.status === status);
        return [row.code, { easiest, byStay }];
      })
    )
);
const headCell = 'sticky top-0 z-10 bg-stone-50 py-3 align-bottom shadow-[inset_0_-1px_0] shadow-stone-200';
</script>

<template>
  <!-- overflow-clip rounds the corners without becoming a scroll container, so the header sticks to the page. -->
  <div class="overflow-clip rounded-2xl border border-stone-200 bg-white">
    <table class="w-full table-fixed text-left text-sm">
      <caption class="sr-only">
        Entry requirements by destination and passport.
      </caption>
      <thead>
        <tr>
          <th scope="col" class="px-3 sm:px-5" :class="[headCell, destinationWidth, stacked && 'hidden sm:table-cell']">
            <span class="eyebrow text-stone-600">Destination</span>
          </th>
          <th
            v-for="(column, index) in columns"
            :id="`${id}-passport-${index}`"
            :key="index"
            scope="col"
            class="px-2 font-medium sm:px-5"
            :class="headCell"
          >
            <span class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2"
              ><CountryFlag :code="column.code" :size="20" /><span class="leading-5">{{ column.name }}</span></span
            >
            <span v-if="mixedDates" class="mt-1 block text-xs font-normal text-stone-600">{{
              dateLabel(column.snapshot.sourceDate)
            }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, rowIndex) in rows" :key="row.code">
          <tr v-if="stacked" class="sm:hidden" :class="rowIndex > 0 && 'border-t border-stone-100'">
            <th :id="`${id}-${row.code}-name`" :colspan="columns.length" class="px-3 pt-3 font-medium">
              <span class="flex items-center gap-2"
                ><CountryFlag :code="row.code" :size="20" /><span>{{ row.name }}</span></span
              >
            </th>
          </tr>
          <tr
            class="hover:bg-stone-50"
            :class="rowIndex > 0 && (stacked ? 'sm:border-t sm:border-stone-100' : 'border-t border-stone-100')"
          >
            <th
              :id="`${id}-${row.code}`"
              scope="row"
              class="px-3 py-3 font-medium sm:px-5"
              :class="stacked && 'hidden sm:table-cell'"
            >
              <span class="flex items-center gap-2 sm:gap-3"
                ><CountryFlag :code="row.code" :size="22" /><span class="min-w-0 break-words">{{
                  row.name
                }}</span></span
              >
            </th>
            <!-- On a phone the row header above is hidden, so each cell names both of its headers itself. -->
            <td
              v-for="(rule, index) in row.rules"
              :key="index"
              :headers="stacked ? `${id}-${row.code}-name ${id}-${row.code} ${id}-passport-${index}` : undefined"
              class="px-2 sm:px-5"
              :class="[
                stacked ? 'pt-1.5 pb-3 sm:py-3' : 'py-3',
                marks.get(row.code)?.easiest.includes(index) && 'bg-lime-50',
              ]"
            >
              <EntryStatus
                :rule="rule"
                :easiest="marks.get(row.code)?.easiest.includes(index)"
                :longest-stay="marks.get(row.code)?.easiest.includes(index) && marks.get(row.code)?.byStay"
                compact
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
