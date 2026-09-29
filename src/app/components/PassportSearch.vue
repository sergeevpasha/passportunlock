<script setup lang="ts">
import { matchesCountry } from '#shared/catalogue';
// An editable combobox with a list of suggestions (the WAI-ARIA "combobox with listbox popup" pattern): type a country,
// then pick it with the arrow keys and Enter, or click it, to open that passport's page.
const props = defineProps<{
  passports: { code: string; code3: string; name: string; visaFree: number; region: string }[];
}>();
const id = useId();
const listId = `${id}-list`;
const optionId = (index: number) => `${id}-option-${index}`;
const query = ref('');
const open = ref(false);
const active = ref(0);
const matches = computed(() => {
  const text = query.value.trim().toLocaleLowerCase('en');
  if (!text) return [];
  // Exact codes first (US, DEU), then names starting with the text, then any other match.
  const score = (passport: (typeof props.passports)[number]) =>
    [passport.code, passport.code3].some(code => code.toLowerCase() === text)
      ? 0
      : passport.name.toLocaleLowerCase('en').startsWith(text)
        ? 1
        : 2;
  return props.passports
    .filter(passport => matchesCountry(passport, text))
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'en'))
    .slice(0, 8);
});
const expanded = computed(() => open.value && matches.value.length > 0);
const status = computed(() => {
  if (!query.value.trim()) return '';
  return matches.value.length
    ? `${matches.value.length} ${matches.value.length === 1 ? 'passport' : 'passports'} found`
    : 'No passport found';
});
watch(query, () => {
  active.value = 0;
  open.value = true;
});
function go(code: string) {
  open.value = false;
  return navigateTo({ path: '/compare', query: { p1: code.toLowerCase() } });
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!matches.value.length) return;
    event.preventDefault();
    if (!expanded.value) {
      open.value = true;
      return;
    }
    const step = event.key === 'ArrowDown' ? 1 : -1;
    active.value = (active.value + step + matches.value.length) % matches.value.length;
  } else if (event.key === 'Enter') {
    const match = matches.value[active.value];
    if (match) {
      event.preventDefault();
      go(match.code);
    }
  } else if (event.key === 'Escape') {
    if (expanded.value) {
      event.preventDefault();
      open.value = false;
    } else query.value = '';
  }
}
</script>

<template>
  <div class="relative">
    <label :id="`${id}-label`" :for="`${id}-input`" class="mb-2 block text-sm font-medium"
      >Which passport do you hold?</label
    >
    <div class="relative">
      <AppIcon
        name="search"
        :size="20"
        class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-500"
      />
      <input
        :id="`${id}-input`"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        :aria-expanded="expanded"
        :aria-controls="listId"
        :aria-activedescendant="expanded ? optionId(active) : undefined"
        placeholder="Country name or code"
        class="h-14 w-full rounded-xl border border-stone-300 bg-white pr-4 pl-12 text-base shadow-xs placeholder:text-stone-500"
        @keydown="onKeydown"
        @focus="open = true"
        @blur="open = false"
      />
    </div>
    <ul
      v-show="expanded"
      :id="listId"
      role="listbox"
      :aria-labelledby="`${id}-label`"
      class="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-900/10"
      @pointerdown.prevent
    >
      <li
        v-for="(passport, index) in matches"
        :id="optionId(index)"
        :key="passport.code"
        role="option"
        :aria-selected="index === active"
        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5"
        :class="index === active && 'bg-stone-100'"
        @pointermove="active = index"
        @click="go(passport.code)"
      >
        <CountryFlag :code="passport.code" :size="24" eager /><span class="flex-1 text-sm font-medium">{{
          passport.name
        }}</span
        ><span class="text-xs text-stone-600">{{ passport.visaFree }} visa-free</span>
      </li>
    </ul>
    <p
      v-if="open && query.trim() && !matches.length"
      class="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-lg shadow-stone-900/10"
    >
      No passport matches “{{ query.trim() }}”.
    </p>
    <p role="status" class="sr-only">{{ status }}</p>
  </div>
</template>
