import type { H3Event } from 'h3';

/** The site's public origin: NUXT_PUBLIC_SITE_URL, or the origin of the request when that is not set. */
export function siteOrigin(event: H3Event) {
  return new URL(useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin).origin;
}
