/** Whether an element has scrolled into view yet. It stays false on the server, so what it gates is drawn in the
 * browser only, once a reader gets near it. */
export function useSeenOnce(margin = '200px') {
  const target = ref<HTMLElement>();
  const seen = ref(false);
  onMounted(() => {
    if (!target.value || !('IntersectionObserver' in window)) {
      seen.value = true;
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        seen.value = true;
        observer.disconnect();
      },
      { rootMargin: margin }
    );
    observer.observe(target.value);
    onBeforeUnmount(() => observer.disconnect());
  });
  return { target, seen };
}
