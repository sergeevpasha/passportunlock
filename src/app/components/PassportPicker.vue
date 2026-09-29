<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
const props = withDefaults(
  defineProps<{
    countries: { code: string; code3: string; name: string; region: string; visaFree: number }[];
    /** Passports already in other slots, which can't be added again. */
    taken?: string[];
    /** The passport in the slot being changed. */
    current?: string;
  }>(),
  { taken: () => [], current: undefined }
);
const emit = defineEmits<{ select: [code: string] }>();
const dialog = useTemplateRef('dialog');
const search = ref('');
const id = useId();
const matches = computed(() =>
  props.countries.filter(item => matchesCountry(item, search.value)).sort((a, b) => a.name.localeCompare(b.name, 'en'))
);
function open() {
  search.value = '';
  dialog.value?.showModal();
}
function choose(code: string) {
  dialog.value?.close();
  if (code !== props.current) emit('select', code);
}
function chooseFirst() {
  const first = matches.value.find(country => !props.taken.includes(country.code));
  if (first) choose(first.code);
}
defineExpose({ open });
</script>

<template>
  <!-- A fixed height keeps the search field in place while the list narrows. -->
  <dialog
    ref="dialog"
    :aria-labelledby="`${id}-title`"
    class="fixed inset-0 m-auto h-[min(40rem,85dvh)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-canvas p-0 text-ink shadow-2xl backdrop:bg-emerald-950/40 backdrop:backdrop-blur-sm"
    @click="if ($event.target === dialog) dialog?.close();"
  >
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between px-6 pt-6">
        <h2 :id="`${id}-title`" class="text-xl font-semibold tracking-tight">Choose a passport</h2>
        <button
          type="button"
          aria-label="Close passport picker"
          class="rounded-full p-2 hover:bg-stone-200"
          @click="dialog?.close()"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <div class="relative m-6 mb-4">
        <AppIcon name="search" :size="18" class="pointer-events-none absolute top-3.5 left-4 text-stone-500" /><label
          :for="`${id}-search`"
          class="sr-only"
          >Search passports</label
        ><input
          :id="`${id}-search`"
          v-model="search"
          autofocus
          type="search"
          placeholder="Country name or code"
          class="h-12 w-full rounded-xl border border-stone-200 bg-white pr-4 pl-11 text-sm placeholder:text-stone-500"
          @keydown.enter.prevent="chooseFirst"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <button
          v-for="country in matches"
          :key="country.code"
          type="button"
          :disabled="taken.includes(country.code)"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left focus-visible:-outline-offset-2 enabled:hover:bg-emerald-50 disabled:opacity-60"
          @click="choose(country.code)"
        >
          <CountryFlag :code="country.code" :size="28" /><span class="flex-1 text-sm font-medium">{{
            country.name
          }}</span>
          <span v-if="taken.includes(country.code)" class="text-xs text-stone-600">Already added</span>
          <span
            v-else-if="country.code === current"
            class="flex items-center gap-1 text-xs font-medium text-emerald-800"
            ><AppIcon name="check" :size="14" />Current</span
          >
          <span v-else class="text-xs text-stone-600">{{ country.visaFree }} visa-free</span>
        </button>
        <p v-if="!matches.length" class="px-3 py-8 text-center text-sm text-stone-600">
          No passports found. Try another country or code.
        </p>
      </div>
    </div>
  </dialog>
</template>
