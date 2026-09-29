<script setup lang="ts" generic="T extends string | number">
// Vue preserves each option's bound value, including numeric map-column indexes.
const model = defineModel<T>({ required: true });
const props = withDefaults(
  defineProps<{
    options: { value: T; label: string }[];
    /** Accessible name. Leave it out when a <label for> points at `id`. */
    label?: string;
    id?: string;
    size?: 'md' | 'sm';
  }>(),
  { label: undefined, id: undefined, size: 'md' }
);
const baseId = useId();
const selectId = computed(() => props.id ?? `${baseId}-select`);
</script>

<template>
  <div class="relative">
    <select
      :id="selectId"
      v-model="model"
      :aria-label="label"
      class="w-full cursor-pointer appearance-none truncate border border-stone-200 text-ink transition-colors hover:border-stone-300 motion-reduce:transition-none"
      :class="
        size === 'sm' ? 'h-9 rounded-lg bg-stone-50 pr-8 pl-3 text-xs' : 'h-12 rounded-xl bg-white pr-10 pl-4 text-sm'
      "
    >
      <option v-for="option in options" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
    </select>
    <AppIcon
      name="down"
      :size="size === 'sm' ? 14 : 16"
      class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-stone-500"
      :class="size === 'sm' ? 'right-2.5' : 'right-3.5'"
    />
  </div>
</template>
