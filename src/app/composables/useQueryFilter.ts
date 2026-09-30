/** A filter kept in the page's address, so a filtered view can be shared. The default and unknown values leave the
 * parameter out, and a change replaces the history entry rather than adding one. */
export function useQueryFilter<T extends string>(name: string, values: readonly T[], fallback: T) {
  const route = useRoute();
  return computed<T>({
    get: () => {
      const value = route.query[name];
      return values.includes(value as T) ? (value as T) : fallback;
    },
    set: value => {
      navigateTo({ query: { ...route.query, [name]: value === fallback ? undefined : value } }, { replace: true });
    },
  });
}
