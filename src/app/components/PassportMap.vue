<script setup lang="ts">
import { worldCountries } from '~/utils/world-map';
import { entryShortLabels } from '~/utils/entry';
import { mapAccess, type MapAccess } from '#shared/map-access';
import { entryDescriptions, entryLabels, requirementTypes, type EntryRule } from '#shared/passports';
const props = defineProps<{
  rows: { code: string; name: string; rules: EntryRule[] }[];
  /** The selected passports, in the order of each row's rules. */
  passports: { name: string }[];
  /** One passport by index, or the easiest way in with any of them. */
  passport: number | 'combined';
}>();

// One hue per entry type, matching the table's badges. Any two can border each other on a map, so every pair was
// checked for separation in normal and colour-blind vision; the table below still lists each rule in words.
const swatches: Record<MapAccess, { fill: string; key: string }> = {
  'visa free': { fill: 'fill-emerald-700', key: 'bg-emerald-700' },
  'visa on arrival': { fill: 'fill-blue-500', key: 'bg-blue-500' },
  eta: { fill: 'fill-violet-700', key: 'bg-violet-700' },
  'e-visa': { fill: 'fill-orange-500', key: 'bg-orange-500' },
  'visa required': { fill: 'fill-stone-400', key: 'bg-stone-400' },
  'no admission': { fill: 'fill-red-700', key: 'bg-red-700' },
  home: { fill: 'fill-emerald-950', key: 'bg-emerald-950' },
  unknown: { fill: 'fill-stone-100', key: 'bg-stone-100 ring-1 ring-stone-300 ring-inset' },
};
const indexed = computed(() => new Map(props.rows.map(row => [row.code, row])));
const shapes = computed(() =>
  worldCountries.map(country => {
    const row = country.code ? indexed.value.get(country.code) : undefined;
    return { ...country, row, access: mapAccess(row?.rules, props.passport) };
  })
);
const legend = computed(() => {
  const counts = new Map<MapAccess, number>();
  for (const row of props.rows) {
    const access = mapAccess(row.rules, props.passport);
    counts.set(access, (counts.get(access) ?? 0) + 1);
  }
  return [
    ...requirementTypes.map(type => ({ access: type, label: entryShortLabels[type], count: counts.get(type) ?? 0 })),
    { access: 'home' as const, label: 'Home country', count: undefined },
    { access: 'unknown' as const, label: 'No data', count: undefined },
  ].map(item => ({ ...item, description: entryDescriptions[item.access === 'home' ? 'domestic' : item.access] }));
});

// A legend entry explains its type and fades the rest of the map: on hover, on keyboard focus, or when tapped.
const explained = ref<MapAccess>();
const explanation = computed(() => legend.value.find(item => item.access === explained.value));
function explainOnPointer(event: PointerEvent, access?: MapAccess) {
  if (event.pointerType === 'mouse') explained.value = access;
}
function explainOnFocus(event: FocusEvent, access: MapAccess) {
  if ((event.target as HTMLElement).matches(':focus-visible')) explained.value = access;
}
function explainOnClick(event: MouseEvent, access: MapAccess) {
  if ((event as PointerEvent).pointerType !== 'mouse')
    explained.value = explained.value === access ? undefined : access;
}

// One tooltip lists the country's rule for every passport on the map. The table below holds the same details.
const frame = useTemplateRef('frame');
const tooltip = useTemplateRef('tooltip');
const pointer = ref<{ index: number; left: number; top: number }>();
function point(event: PointerEvent) {
  const index = Number((event.target as Element).closest('[data-index]')?.getAttribute('data-index'));
  const box = frame.value?.getBoundingClientRect();
  if (!box || !Number.isInteger(index)) {
    pointer.value = undefined;
    return;
  }
  // The tooltip opens toward the middle of the map, then is kept inside it. Its size is taken from the last one shown.
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  const width = tooltip.value?.offsetWidth ?? 220;
  const height = tooltip.value?.offsetHeight ?? 80;
  const left = x > box.width / 2 ? x - 14 - width : x + 14;
  const top = y > box.height / 2 ? y - 14 - height : y + 14;
  pointer.value = {
    index,
    left: Math.max(0, Math.min(left, box.width - width)),
    top: Math.max(0, Math.min(top, box.height - height)),
  };
}
function leave(event: PointerEvent) {
  // A tap ends with pointerleave; keep its tooltip until the next tap.
  if (event.pointerType !== 'touch') pointer.value = undefined;
}
const hovered = computed(() => {
  const shape = pointer.value && shapes.value[pointer.value.index];
  if (!shape) return undefined;
  const columns = props.passport === 'combined' ? props.passports.map((_, index) => index) : [props.passport];
  return {
    shape,
    lines: shape.row
      ? columns.map(index => {
          const rule = shape.row!.rules[index] ?? { status: 'unknown' as const };
          return {
            access: mapAccess([rule], 0),
            label: entryLabels[rule.status],
            days: rule.days,
            passport: props.passports[index]?.name,
          };
        })
      : [],
  };
});
</script>

<template>
  <div>
    <div ref="frame" class="relative">
      <svg
        viewBox="0 0 1000 520"
        role="img"
        aria-label="World map of the easiest way into each destination. The destination table below lists every rule."
        class="mx-auto max-h-80 w-full"
        @pointermove="point"
        @pointerdown="point"
        @pointerleave="leave"
      >
        <path
          v-for="(country, index) in shapes"
          :key="country.id"
          :d="country.path"
          :data-index="index"
          class="stroke-[#f8f9f5] stroke-[0.8] transition-opacity motion-reduce:transition-none"
          :class="[swatches[country.access].fill, explained && explained !== country.access && 'opacity-20']"
        />
        <path
          v-if="hovered"
          :d="hovered.shape.path"
          class="pointer-events-none fill-none stroke-[#202923] stroke-[1.5]"
        />
      </svg>
      <div
        v-if="hovered"
        ref="tooltip"
        class="pointer-events-none absolute z-10 w-max max-w-72 rounded-xl border border-stone-200 bg-white px-3.5 py-3 shadow-lg shadow-stone-900/10"
        :style="{ left: `${pointer!.left}px`, top: `${pointer!.top}px` }"
      >
        <p class="flex items-center gap-2 text-xs font-semibold text-[#202923]">
          <CountryFlag v-if="hovered.shape.row" :code="hovered.shape.row.code" :size="16" eager />{{
            hovered.shape.row?.name ?? hovered.shape.name
          }}
        </p>
        <ul v-if="hovered.lines.length" class="mt-2 space-y-1.5">
          <li v-for="(line, index) in hovered.lines" :key="index" class="flex items-center gap-2 text-[11px]">
            <span class="h-1 w-3 shrink-0 rounded-full" :class="swatches[line.access].key" /><span
              class="font-medium text-[#202923]"
              >{{ line.label }}</span
            ><span v-if="line.days" class="text-stone-500">{{ line.days }} days</span
            ><span class="ml-auto pl-4 text-stone-500">{{ line.passport }}</span>
          </li>
        </ul>
        <p v-else class="mt-1 text-[11px] text-stone-500">Not in the dataset</p>
      </div>
    </div>
    <div class="relative mt-3">
      <p
        v-if="explanation"
        id="map-legend-note"
        role="tooltip"
        class="pointer-events-none absolute inset-x-0 bottom-full z-10 mx-auto mb-2 w-fit max-w-sm rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[11px] leading-5 text-stone-600 shadow-lg shadow-stone-900/10"
      >
        <span class="flex items-center gap-2 font-semibold text-[#202923]"
          ><span class="h-2.5 w-2.5 rounded-sm" :class="swatches[explanation.access].key" />{{ explanation.label
          }}<span v-if="explanation.count !== undefined" class="font-normal text-stone-500"
            >{{ explanation.count }} {{ explanation.count === 1 ? 'destination' : 'destinations' }}</span
          ></span
        >
        {{ explanation.description }}
      </p>
      <ul class="flex flex-wrap justify-center gap-x-1 gap-y-1 text-[10px] text-stone-600">
        <li v-for="item in legend" :key="item.access">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-white/70 motion-reduce:transition-none"
            :class="explained === item.access && 'bg-white/70'"
            :aria-describedby="explained === item.access ? 'map-legend-note' : undefined"
            @pointerenter="explainOnPointer($event, item.access)"
            @pointerleave="explainOnPointer($event)"
            @focus="explainOnFocus($event, item.access)"
            @blur="explained = undefined"
            @click="explainOnClick($event, item.access)"
          >
            <span class="h-2.5 w-2.5 rounded-sm" :class="swatches[item.access].key" /><span
              class="underline decoration-stone-300 decoration-dotted underline-offset-2"
              >{{ item.label }}</span
            ><span v-if="item.count !== undefined" class="font-medium text-[#202923]">{{ item.count }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
