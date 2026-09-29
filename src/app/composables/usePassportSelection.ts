import { comparisonQuery, maxPassports } from '#shared/comparison-query';

export function usePassportSelection() {
  const selected = useState<string[]>('selected-passports', () => []);
  const message = ref('');
  const comparisonLink = computed(() => ({
    path: '/compare',
    query: comparisonQuery(selected.value.map(code => ({ code }))),
  }));

  function toggle(code: string) {
    message.value = '';
    if (selected.value.includes(code)) selected.value = selected.value.filter(item => item !== code);
    else if (selected.value.length < maxPassports) selected.value = [...selected.value, code];
    else message.value = `You can compare up to ${maxPassports} passports. Remove one to add another.`;
  }

  function clear() {
    selected.value = [];
    message.value = '';
  }

  return { selected, message, comparisonLink, toggle, clear };
}
