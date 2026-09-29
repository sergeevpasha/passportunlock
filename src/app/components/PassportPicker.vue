<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
defineProps<{ countries: { code: string; code3: string; name: string; region: string; visaFree: number }[] }>();
const emit = defineEmits<{ select: [code: string] }>();
const dialog = useTemplateRef('dialog');
const search = ref('');
const id = useId();
function open() {
  search.value = '';
  dialog.value?.showModal();
}
function choose(code: string) {
  dialog.value?.close();
  emit('select', code);
}
defineExpose({ open });
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="`${id}-title`"
    class="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-[#f8f9f5] p-0 text-stone-800 shadow-2xl backdrop:bg-emerald-950/40 backdrop:backdrop-blur-sm"
    @click="if ($event.target === dialog) dialog?.close();"
  >
    <div class="flex max-h-[80dvh] flex-col">
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
      <div class="relative m-6">
        <AppIcon name="search" :size="18" class="absolute top-3.5 left-4 text-stone-400" /><label
          :for="`${id}-search`"
          class="sr-only"
          >Search passports</label
        ><input
          :id="`${id}-search`"
          v-model="search"
          autofocus
          type="search"
          placeholder="Search a country…"
          class="h-12 w-full rounded-xl border border-stone-200 bg-white pr-4 pl-11 text-sm"
        />
      </div>
      <div class="overflow-y-auto overscroll-contain px-3 pb-3">
        <button
          v-for="country in countries.filter(item => matchesCountry(item, search))"
          :key="country.code"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emerald-50"
          @click="choose(country.code)"
        >
          <CountryFlag :code="country.code" :size="28" /><span class="flex-1 text-sm font-medium">{{
            country.name
          }}</span
          ><span class="text-xs text-stone-500">{{ country.visaFree }} visa-free</span
          ><AppIcon name="plus" :size="16" class="text-emerald-800" />
        </button>
        <p
          v-if="!countries.some(item => matchesCountry(item, search))"
          class="px-3 py-8 text-center text-sm text-stone-500"
        >
          No passports found. Try another country or code.
        </p>
      </div>
    </div>
  </dialog>
</template>
