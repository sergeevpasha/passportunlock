<script setup lang="ts" generic="T extends string | number">
// A select in the site's style, following the WAI-ARIA "select-only combobox" pattern: focus stays on the button,
// and arrow keys, Home/End, typing, Enter, Space, Escape and Tab behave like a native select. The menu is teleported
// to <body> so containers with hidden overflow cannot clip it.
const model = defineModel<T>({ required: true });
const props = withDefaults(
  defineProps<{
    /** Consecutive options with the same `group` are listed under that heading. */
    options: { value: T; label: string; group?: string }[];
    /** Accessible name. Leave it out when a <label for> points at `id`. */
    label?: string;
    id?: string;
    size?: 'md' | 'sm';
    /** Which edge of the button the menu lines up with. */
    align?: 'start' | 'end';
  }>(),
  { label: undefined, id: undefined, size: 'md', align: 'start' }
);
const baseId = useId();
const buttonId = computed(() => props.id ?? `${baseId}-button`);
const listId = `${baseId}-list`;
const optionId = (index: number) => `${baseId}-option-${index}`;
const button = useTemplateRef('button');
const panel = useTemplateRef('panel');
const open = ref(false);
const active = ref(0);
const placement = ref<Record<string, string>>({});
const selected = computed(() => props.options.findIndex(option => option.value === model.value));
const last = computed(() => props.options.length - 1);
const sections = computed(() =>
  props.options.reduce<{ label?: string; items: { option: (typeof props.options)[number]; index: number }[] }[]>(
    (list, option, index) => {
      const section = list.at(-1);
      if (section && section.label === option.group) section.items.push({ option, index });
      else list.push({ label: option.group, items: [{ option, index }] });
      return list;
    },
    []
  )
);

function place() {
  const trigger = button.value?.getBoundingClientRect();
  if (!trigger || !panel.value) return;
  const width = Math.max(panel.value.offsetWidth, trigger.width);
  const height = panel.value.offsetHeight;
  const below = window.innerHeight - trigger.bottom;
  const up = below < height + 12 && trigger.top > below;
  const left = props.align === 'end' ? trigger.right - width : trigger.left;
  placement.value = {
    minWidth: `${trigger.width}px`,
    left: `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`,
    top: `${up ? trigger.top - height - 6 : trigger.bottom + 6}px`,
  };
}
function show(index = Math.max(selected.value, 0)) {
  active.value = index;
  open.value = true;
}
function hide() {
  open.value = false;
}
function choose(index: number) {
  const option = props.options[index];
  if (option) model.value = option.value;
  hide();
}

// Typing jumps to the next option starting with the typed letters; a pause of half a second starts a new search.
let typed = '';
let typedAt = 0;
function typeAhead(key: string) {
  typed = Date.now() - typedAt > 500 ? key : typed + key;
  typedAt = Date.now();
  const labels = props.options.map(option => option.label.toLocaleLowerCase('en'));
  const start = typed.length === 1 ? active.value + 1 : active.value;
  const match = labels
    .map((_, offset) => (start + offset) % labels.length)
    .find(index => labels[index]!.startsWith(typed.toLocaleLowerCase('en')));
  if (match !== undefined) active.value = match;
}

function onKeydown(event: KeyboardEvent) {
  const { key } = event;
  const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      show(key === 'Home' ? 0 : key === 'End' ? last.value : undefined);
    } else if (printable) {
      show();
      typeAhead(key);
    }
    return;
  }
  const moves: Record<string, number> = {
    ArrowDown: active.value + 1,
    ArrowUp: active.value - 1,
    PageDown: active.value + 10,
    PageUp: active.value - 10,
    Home: 0,
    End: last.value,
  };
  if (key === 'ArrowUp' && event.altKey) {
    event.preventDefault();
    choose(active.value);
  } else if (key in moves) {
    event.preventDefault();
    active.value = Math.max(0, Math.min(moves[key]!, last.value));
  } else if (key === 'Enter' || key === ' ') {
    event.preventDefault();
    choose(active.value);
  } else if (key === 'Escape') {
    event.preventDefault();
    hide();
  } else if (key === 'Tab') {
    choose(active.value);
  } else if (printable) {
    typeAhead(key);
  }
}

function onPointerDown(event: Event) {
  const target = event.target as Node;
  if (!button.value?.contains(target) && !panel.value?.contains(target)) hide();
}
function listen(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDown, true);
  window[method]('resize', place);
  window[method]('scroll', place, true);
}
watch(open, async isOpen => {
  listen(isOpen);
  if (!isOpen) return;
  await nextTick();
  place();
});
watch(active, async () => {
  await nextTick();
  document.getElementById(optionId(active.value))?.scrollIntoView({ block: 'nearest' });
});
onBeforeUnmount(() => listen(false));
</script>

<template>
  <div>
    <button
      :id="buttonId"
      ref="button"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="open ? optionId(active) : undefined"
      class="flex w-full items-center justify-between gap-3 border text-left text-[#202923] transition-colors motion-reduce:transition-none"
      :class="[
        size === 'sm'
          ? 'h-9 rounded-lg bg-stone-50 pr-2.5 pl-3 text-xs'
          : 'h-12 rounded-xl bg-white pr-3.5 pl-4 text-sm',
        open ? 'border-emerald-700/40' : 'border-stone-200 hover:border-stone-300',
      ]"
      @click="open ? hide() : show()"
      @keydown="onKeydown"
      @blur="hide"
    >
      <span class="truncate">{{ options[selected]?.label }}</span>
      <AppIcon
        name="down"
        :size="size === 'sm' ? 14 : 16"
        class="text-stone-400 transition-transform duration-200 motion-reduce:transition-none"
        :class="open && 'rotate-180'"
      />
    </button>
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
        enter-from-class="-translate-y-1 opacity-0"
        leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
        leave-to-class="opacity-0"
      >
        <ul
          v-if="open"
          :id="listId"
          ref="panel"
          role="listbox"
          :aria-label="label"
          :aria-labelledby="label ? undefined : buttonId"
          :style="placement"
          class="fixed z-50 max-h-72 max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white p-1.5 font-sans text-[#202923] shadow-lg shadow-stone-900/10"
          @pointerdown.prevent
        >
          <li
            v-for="(section, sectionIndex) in sections"
            :key="sectionIndex"
            :role="section.label ? 'group' : 'none'"
            :aria-labelledby="section.label ? `${baseId}-group-${sectionIndex}` : undefined"
          >
            <p
              v-if="section.label"
              :id="`${baseId}-group-${sectionIndex}`"
              class="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-stone-500 uppercase"
            >
              {{ section.label }}
            </p>
            <ul role="none">
              <li
                v-for="{ option, index } in section.items"
                :id="optionId(index)"
                :key="String(option.value)"
                role="option"
                :aria-selected="index === selected"
                class="flex cursor-pointer items-center justify-between gap-6 rounded-lg whitespace-nowrap"
                :class="[
                  size === 'sm' ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm',
                  index === active ? 'bg-stone-100' : '',
                  index === selected ? 'font-medium text-emerald-900' : 'text-stone-600',
                ]"
                @pointermove="active = index"
                @click="choose(index)"
              >
                {{ option.label }}
                <AppIcon
                  v-if="index === selected"
                  name="check"
                  :size="size === 'sm' ? 14 : 16"
                  class="text-emerald-700"
                />
              </li>
            </ul>
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>
