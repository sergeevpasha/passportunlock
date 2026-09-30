<script setup lang="ts">
import { countrySummary } from '#shared/countries';
import { countrySlugs, entryPath } from '#shared/country-paths';
type Choice = { code: string; name: string };
const props = defineProps<{
  passport?: Choice;
  destination?: Choice;
  /** The countries to choose from. By default every country in the dataset, named by the browser. */
  countries?: { code: string; code3: string; name: string }[];
}>();
const passport = ref(props.passport);
const destination = ref(props.destination);
// Another trip's page brings its own choices.
watch(
  () => [props.passport, props.destination],
  () => {
    passport.value = props.passport;
    destination.value = props.destination;
  }
);
const list = computed(() =>
  [...(props.countries ?? Object.keys(countrySlugs).map(countrySummary))].sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )
);
const id = useId();
const picker = useTemplateRef('picker');
const picking = ref<'passport' | 'destination'>('passport');
function pick(field: 'passport' | 'destination') {
  picking.value = field;
  picker.value?.open();
}
function select(code: string) {
  const country = list.value.find(item => item.code === code);
  if (!country) return;
  if (picking.value === 'passport') passport.value = { code, name: country.name };
  else destination.value = { code, name: country.name };
}
function swap() {
  [passport.value, destination.value] = [destination.value, passport.value];
}
const sameCountry = computed(() => !!passport.value && passport.value.code === destination.value?.code);
function check() {
  if (passport.value && destination.value && !sameCountry.value)
    navigateTo(entryPath(destination.value.code, passport.value.code));
}
</script>

<template>
  <div class="@container">
    <form
      class="grid items-end gap-3 @lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @4xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]"
      @submit.prevent="check"
    >
      <div>
        <p :id="`${id}-passport`" class="mb-2 text-[10px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          Passport
        </p>
        <button
          type="button"
          :aria-labelledby="`${id}-passport ${id}-passport-value`"
          class="flex h-12 w-full items-center gap-3 rounded-xl border border-stone-200 bg-white pr-3.5 pl-3 text-left text-sm transition-colors hover:border-stone-300 motion-reduce:transition-none"
          @click="pick('passport')"
        >
          <CountryFlag v-if="passport" :code="passport.code" :size="24" eager /><span
            v-else
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"
            ><AppIcon name="passport" :size="14" /></span
          ><span :id="`${id}-passport-value`" class="flex-1 truncate" :class="!passport && 'text-stone-500'">{{
            passport?.name ?? 'Choose a passport'
          }}</span
          ><AppIcon name="down" :size="16" class="text-stone-400" />
        </button>
      </div>
      <button
        type="button"
        aria-label="Swap passport and destination"
        class="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-emerald-700 hover:text-emerald-800 motion-reduce:transition-none @lg:mb-1"
        @click="swap"
      >
        <AppIcon name="compare" :size="17" class="rotate-90 @lg:rotate-0" />
      </button>
      <div>
        <p :id="`${id}-destination`" class="mb-2 text-[10px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          Destination
        </p>
        <button
          type="button"
          :aria-labelledby="`${id}-destination ${id}-destination-value`"
          class="flex h-12 w-full items-center gap-3 rounded-xl border border-stone-200 bg-white pr-3.5 pl-3 text-left text-sm transition-colors hover:border-stone-300 motion-reduce:transition-none"
          @click="pick('destination')"
        >
          <CountryFlag v-if="destination" :code="destination.code" :size="24" eager /><span
            v-else
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"
            ><AppIcon name="globe" :size="14" /></span
          ><span :id="`${id}-destination-value`" class="flex-1 truncate" :class="!destination && 'text-stone-500'">{{
            destination?.name ?? 'Choose a destination'
          }}</span
          ><AppIcon name="down" :size="16" class="text-stone-400" />
        </button>
      </div>
      <button
        type="submit"
        :disabled="!passport || !destination || sameCountry"
        class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-40 motion-reduce:transition-none @lg:col-span-3 @4xl:col-span-1"
      >
        Check entry rules<AppIcon name="arrow" :size="17" />
      </button>
    </form>
    <p v-if="sameCountry" role="alert" class="mt-3 text-xs text-amber-800">
      That’s the passport’s own country. Choose another destination.
    </p>
    <CountryPicker
      ref="picker"
      :countries="list"
      :title="picking === 'passport' ? 'Choose a passport' : 'Choose a destination'"
      :selected="(picking === 'passport' ? passport : destination)?.code"
      @select="select"
    />
  </div>
</template>
