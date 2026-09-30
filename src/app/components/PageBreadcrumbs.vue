<script setup lang="ts">
const props = defineProps<{ items: { label: string; to?: string }[] }>();
// The same trail as structured data, which search results can show in place of the address.
const origin = useRequestURL().origin;
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: props.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          ...(item.to ? { item: new URL(item.to, origin).href } : {}),
        })),
      }),
    },
  ],
});
</script>

<template>
  <nav aria-label="Breadcrumb" class="mb-7 text-xs text-stone-500">
    <ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <li v-for="(item, index) in items" :key="index" class="flex items-center gap-1.5">
        <AppIcon v-if="index" name="down" :size="12" class="-rotate-90 text-stone-400" />
        <NuxtLink v-if="item.to" :to="item.to" class="hover:text-emerald-800">{{ item.label }}</NuxtLink>
        <span v-else aria-current="page" class="text-stone-700">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
