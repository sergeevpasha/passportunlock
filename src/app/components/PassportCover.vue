<script setup lang="ts">
withDefaults(defineProps<{ name?: string; tone?: 'green' | 'blue' | 'red' }>(), { name: undefined, tone: 'green' });
const tones = {
  green: 'bg-[#204e3c] text-[#e2e8ba]',
  blue: 'bg-[#263c51] text-[#d8dabe]',
  red: 'bg-[#693c3e] text-[#e8d4b9]',
};
</script>

<template>
  <div
    class="flex aspect-[0.72] w-32 flex-col items-center rounded-r-xl rounded-l-sm border-l-4 border-black/20 p-3 shadow-xl sm:w-36"
    :class="tones[tone]"
  >
    <div class="flex h-full w-full flex-col items-center rounded-md border border-current/25 pt-5 pb-3">
      <span class="text-[9px] font-medium tracking-[0.2em] uppercase">Passport</span>
      <AppIcon name="globe" :size="45" class="my-auto opacity-80" />
      <span v-if="name" class="px-2 text-center text-[8px] tracking-[0.14em] uppercase">{{ name }}</span>
      <AppIcon name="chip" :size="19" class="mt-4 opacity-70" />
    </div>
  </div>
</template>
