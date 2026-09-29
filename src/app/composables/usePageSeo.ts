import { toValue, type MaybeRefOrGetter } from 'vue';

const siteName = 'Passport Unlock';

/** The site's public origin: NUXT_PUBLIC_SITE_URL, or the origin of the current request when that is not set. */
export function useSiteOrigin() {
  return new URL(useRuntimeConfig().public.siteUrl || useRequestURL().origin).origin;
}

/** The title, description, canonical link and social-card tags of a page. */
export function usePageSeo(page: {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  /** The canonical path, with any query that changes the content; the current path by default. */
  path?: MaybeRefOrGetter<string | undefined>;
}) {
  const route = useRoute();
  const origin = useSiteOrigin();
  const url = computed(() => new URL(toValue(page.path) ?? route.path, origin).href);
  useSeoMeta({
    title: page.title,
    description: page.description,
    ogTitle: page.title,
    ogDescription: page.description,
    ogUrl: url,
    ogType: 'website',
    ogSiteName: siteName,
    ogImage: `${origin}/og-image.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'Passport Unlock: visa requirements for 199 passports',
    twitterCard: 'summary_large_image',
  });
  useHead({ link: [{ rel: 'canonical', href: url }] });
}
