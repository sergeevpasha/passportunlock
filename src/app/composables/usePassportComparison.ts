import { comparisonQuery, parseComparisonQuery, type PassportSelection } from '#shared/comparison-query';

export function usePassportComparison() {
  const route = useRoute();
  const selections = computed(() => {
    try {
      return parseComparisonQuery(route.query);
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Choose a supported passport.' });
    }
  });
  const query = computed(() => comparisonQuery(selections.value));
  const request = useFetch('/api/compare', { query });
  function update(next: PassportSelection[]) {
    return navigateTo({
      path: '/compare',
      query: comparisonQuery(next),
    });
  }
  function setPassport(index: number, code: string) {
    const next = [...selections.value];
    next[index] = { code, snapshot: next[index]?.snapshot ?? 'latest' };
    return update(next);
  }
  function setSnapshot(index: number, snapshot: string) {
    return update(selections.value.map((selection, i) => (i === index ? { ...selection, snapshot } : selection)));
  }
  function removePassport(index: number) {
    if (selections.value.length > 1) return update(selections.value.filter((_, i) => i !== index));
  }
  return { request, selections, query, setPassport, setSnapshot, removePassport };
}
