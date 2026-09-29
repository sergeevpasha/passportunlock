export function usePassportComparison() {
  const route = useRoute();
  const selections = computed(() =>
    [1, 2, 3].flatMap(index => {
      const code = route.query[`p${index}`] ?? (index === 1 ? 'SG' : index === 2 && !route.query.p1 ? 'US' : undefined);
      return typeof code === 'string'
        ? [{ code: code.toUpperCase(), snapshot: String(route.query[`s${index}`] ?? 'latest') }]
        : [];
    })
  );
  const query = computed(() =>
    Object.fromEntries(
      selections.value.flatMap((selection, index) => [
        [`p${index + 1}`, selection.code],
        [`s${index + 1}`, selection.snapshot],
      ])
    )
  );
  const request = useFetch('/api/compare', { query });
  function update(next: typeof selections.value) {
    return navigateTo({
      path: '/compare',
      query: Object.fromEntries(
        next.flatMap((selection, index) => [
          [`p${index + 1}`, selection.code.toLowerCase()],
          [`s${index + 1}`, selection.snapshot],
        ])
      ),
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
