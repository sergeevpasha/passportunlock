import { toValue, type MaybeRefOrGetter } from 'vue';

const siteName = 'Passport Unlock';

/** The title, description, canonical link and social-card tags of a page, on whichever domain served it. */
export function usePageSeo(page: {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  /** The canonical path, with any query that changes the content; the current path by default. */
  path?: MaybeRefOrGetter<string | undefined>;
}) {
  const route = useRoute();
  const origin = useRequestURL().origin;
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
