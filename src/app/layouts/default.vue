<script setup lang="ts">
const navigation = [
  { to: '/', label: 'Overview', icon: 'grid' },
  { to: '/passports', label: 'Passports', icon: 'passport' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
] as const;
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas font-sans text-ink antialiased selection:bg-lime-200">
    <a href="#main" class="fixed -top-20 left-4 z-50 rounded-lg bg-emerald-900 px-5 py-3 text-white focus:top-4"
      >Skip to content</a
    >
    <header class="border-b border-stone-200/80 bg-canvas">
      <div
        class="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-5 px-5 pt-5 pb-3 sm:px-8 lg:h-22 lg:flex-nowrap lg:px-12 lg:py-0"
      >
        <NuxtLink to="/" aria-label="Passport Unlock home" class="flex shrink-0 items-center gap-2.5">
          <BrandLogo />
        </NuxtLink>
        <nav
          aria-label="Main navigation"
          class="order-3 flex w-full justify-between gap-1 lg:order-none lg:w-auto lg:gap-2"
        >
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-emerald-900 motion-reduce:transition-none aria-[current=page]:bg-white aria-[current=page]:text-emerald-900 aria-[current=page]:shadow-xs aria-[current=page]:ring-1 aria-[current=page]:ring-stone-200 sm:px-4"
          >
            <AppIcon :name="item.icon" :size="16" class="hidden sm:block" />{{ item.label }}
          </NuxtLink>
        </nav>
        <NuxtLink
          to="/about"
          aria-label="About the data"
          class="flex min-h-10 items-center gap-1.5 text-sm text-stone-600 hover:text-emerald-800 aria-[current=page]:font-semibold aria-[current=page]:text-emerald-900"
          ><AppIcon name="info" :size="16" /><span class="hidden sm:inline">About the data</span></NuxtLink
        >
      </div>
    </header>
    <main id="main" tabindex="-1" class="mx-auto w-full max-w-[1320px] flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
      <slot />
    </main>
    <footer class="mt-12 border-t border-stone-200">
      <div
        class="mx-auto flex max-w-[1320px] flex-col justify-between gap-5 px-5 py-7 text-xs text-stone-600 sm:flex-row sm:items-center sm:px-8 lg:px-12"
      >
        <p>Entry rules change. Confirm them with the destination before you travel.</p>
        <div class="flex shrink-0 gap-5">
          <NuxtLink to="/about" class="hover:text-emerald-800">About the data</NuxtLink
          ><NuxtLink to="/about#credits" class="hover:text-emerald-800">Credits</NuxtLink><span>Passport Unlock</span>
        </div>
      </div>
    </footer>
  </div>
</template>
