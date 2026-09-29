// gtag.js is the largest script on every page. Loading it after hydration, when the browser is idle,
// keeps it off the first render. Visits that end before then aren't counted.
export default defineNuxtPlugin(nuxtApp => {
  if (!useRuntimeConfig().public.gtag?.id) return;
  const { initialize } = useGtag();
  onNuxtReady(() => nuxtApp.runWithContext(() => initialize()));
});
