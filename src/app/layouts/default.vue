<script setup lang="ts">
import { iconPaths } from '~/utils/icons';
const navigation = [
  { to: '/', label: 'Overview', icon: 'grid' },
  { to: '/passports', label: 'Passports', icon: 'passport' },
  { to: '/destinations', label: 'Destinations', icon: 'globe' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
  { to: '/rankings', label: 'Ranking', icon: 'ranking' },
] as const;
const current = 'bg-white text-emerald-900 shadow-xs ring-1 ring-stone-200';
const route = useRoute();
// A page inside a section, such as one destination, keeps the section highlighted. On narrow screens the Overview
// link gives way to the others, as the logo also leads home.
const inSection = (to: string) => to !== '/' && route.path.startsWith(`${to}/`);
// Long lists repeat these icons on every row, so each row points at one copy instead of drawing its own.
const listIcons = ['check', 'diagonal'] as const;
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-[#f8f9f5] font-sans text-[#202923] antialiased selection:bg-lime-200 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-emerald-700 [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_select]:cursor-pointer"
  >
    <a href="#main" class="fixed -top-20 left-4 z-50 rounded-lg bg-emerald-900 px-5 py-3 text-white focus:top-4"
      >Skip to content</a
    >
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <symbol
        v-for="icon in listIcons"
        :id="`icon-${icon}`"
        :key="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="iconPaths[icon]" />
      </symbol>
    </svg>
    <header class="border-b border-stone-200/80 bg-[#f8f9f5]">
      <div
        class="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-5 px-5 pt-5 pb-3 sm:px-8 lg:h-22 lg:flex-nowrap lg:px-12 lg:py-0"
      >
        <NuxtLink to="/" aria-label="Passport Unlock home" class="flex shrink-0 items-center gap-2.5">
          <BrandLogo />
        </NuxtLink>
        <nav
          aria-label="Main navigation"
          class="order-3 flex w-full justify-between overflow-x-auto sm:gap-1 lg:order-none lg:w-auto lg:gap-2"
        >
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="min-h-10 items-center justify-center gap-2 rounded-lg px-1.5 text-xs font-medium whitespace-nowrap text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-emerald-900 motion-reduce:transition-none min-[360px]:px-2.5 sm:px-4 sm:text-sm"
            :class="[item.to === '/' ? 'hidden md:inline-flex' : 'inline-flex', inSection(item.to) && current]"
            :exact-active-class="current"
          >
            <AppIcon :name="item.icon" :size="16" class="hidden sm:block" />{{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main id="main" tabindex="-1" class="mx-auto w-full max-w-[1320px] flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
      <slot />
    </main>
    <footer class="mt-12 border-t border-stone-200">
      <div
        class="mx-auto flex max-w-[1320px] flex-col justify-between gap-5 px-5 py-7 text-xs text-stone-500 sm:flex-row sm:items-center sm:px-8 lg:px-12"
      >
        <p>Entry rules change. Confirm them with the destination before you travel.</p>
        <span class="shrink-0">Passport Unlock</span>
      </div>
    </footer>
  </div>
</template>
