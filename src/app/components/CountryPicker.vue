<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
import type { IconName } from '~/utils/icons';
const props = withDefaults(
  defineProps<{
    countries: { code: string; code3: string; name: string; detail?: string }[];
    title?: string;
    /** The country already chosen, which is marked in the list. */
    selected?: string;
    /** Shown on every row, such as a plus for adding a passport. */
    icon?: IconName;
  }>(),
  { title: 'Choose a passport', selected: undefined, icon: undefined }
);
const emit = defineEmits<{ select: [code: string] }>();
const dialog = useTemplateRef('dialog');
const search = ref('');
// The list is drawn only while the dialog is open, so a page with a picker doesn't carry 199 hidden rows.
const isOpen = ref(false);
const id = useId();
function open() {
  search.value = '';
  isOpen.value = true;
  dialog.value?.showModal();
}
const matches = computed(() => props.countries.filter(country => matchesCountry(country, search.value)));
function choose(code: string) {
  dialog.value?.close();
  emit('select', code);
}
// Enter in the search box takes the first match.
function chooseFirst() {
  if (search.value.trim() && matches.value[0]) choose(matches.value[0].code);
}
defineExpose({ open });
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="`${id}-title`"
    class="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-[#f8f9f5] p-0 text-stone-800 shadow-2xl backdrop:bg-emerald-950/40 backdrop:backdrop-blur-sm"
    @click="if ($event.target === dialog) dialog?.close();"
    @close="isOpen = false"
  >
    <div class="flex max-h-[80dvh] flex-col">
      <div class="flex items-center justify-between px-6 pt-6">
        <h2 :id="`${id}-title`" class="text-xl font-semibold tracking-tight">{{ title }}</h2>
        <button type="button" aria-label="Close" class="rounded-full p-2 hover:bg-stone-200" @click="dialog?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <div class="relative m-6">
        <AppIcon name="search" :size="18" class="absolute top-3.5 left-4 text-stone-400" /><label
          :for="`${id}-search`"
          class="sr-only"
          >Search countries</label
        ><input
          :id="`${id}-search`"
          v-model="search"
          autofocus
          type="search"
          placeholder="Search a country…"
          class="h-12 w-full rounded-xl border border-stone-200 bg-white pr-4 pl-11 text-sm"
          @keydown.enter.prevent="chooseFirst"
        />
      </div>
      <div v-if="isOpen" class="overflow-y-auto overscroll-contain px-3 pb-3">
        <button
          v-for="country in matches"
          :key="country.code"
          type="button"
          :aria-current="country.code === selected || undefined"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emerald-50"
          :class="country.code === selected && 'bg-emerald-50/70'"
          @click="choose(country.code)"
        >
          <CountryFlag :code="country.code" :size="28" /><span class="flex-1 text-sm font-medium">{{
            country.name
          }}</span
          ><span v-if="country.detail" class="text-xs text-stone-500">{{ country.detail }}</span
          ><AppIcon
            v-if="country.code === selected || icon"
            :name="country.code === selected ? 'check' : icon"
            :size="16"
            class="text-emerald-800"
          />
        </button>
        <p v-if="!matches.length" class="px-3 py-8 text-center text-sm text-stone-500">
          No countries found. Try another name or code.
        </p>
      </div>
    </div>
  </dialog>
</template>
