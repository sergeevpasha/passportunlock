<script setup lang="ts">
import type { PassportSummary } from '#shared/catalogue';
import { passportPath } from '#shared/country-paths';
defineProps<{ passport: PassportSummary; selected: boolean }>();
defineEmits<{ toggle: [code: string] }>();
</script>

<template>
  <article
    class="group rounded-2xl border bg-white p-5 transition-colors motion-reduce:transition-none"
    :class="selected ? 'border-emerald-700 ring-1 ring-emerald-700' : 'border-stone-200 hover:border-emerald-700/40'"
  >
    <button
      type="button"
      :aria-pressed="selected"
      :aria-label="`${selected ? 'Remove' : 'Select'} ${passport.name}`"
      class="block w-full text-left"
      @click="$emit('toggle', passport.code)"
    >
      <div class="flex items-start justify-between">
        <CountryFlag :code="passport.code" :size="38" /><span
          class="flex h-6 w-6 items-center justify-center rounded-full border"
          :class="
            selected
              ? 'border-emerald-800 bg-emerald-800 text-white'
              : 'border-stone-200 text-stone-400 group-hover:border-emerald-700 group-hover:text-emerald-700'
          "
          ><AppIcon :name="selected ? 'check' : 'plus'" :size="14"
        /></span>
      </div>
      <h2 class="mt-5 truncate text-base font-semibold tracking-tight">{{ passport.name }}</h2>
      <p class="mt-1 text-xs text-stone-500">
        {{ passport.region }} <span aria-hidden="true">·</span> {{ passport.code3 }}
      </p>
      <div class="mt-6 flex items-end justify-between">
        <p>
          <span class="text-3xl font-medium tracking-tight">{{ passport.visaFree }}</span
          ><span class="ml-1.5 text-[11px] text-stone-500">visa-free</span>
        </p>
        <span class="rounded-md bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-600"
          >Rank #{{ passport.rank }}</span
        >
      </div>
    </button>
    <NuxtLink
      :to="passportPath(passport.code)"
      class="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs font-medium text-emerald-800 hover:text-emerald-600"
      ><span>View destinations</span><AppIcon name="arrow" :size="16"
    /></NuxtLink>
  </article>
</template>
