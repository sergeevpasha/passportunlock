import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

/** The world map's modules: app/utils/world-map.ts, the components that draw it, and the libraries and atlas it uses */
const WORLD_MAP_CODE =
  /[\\/](@d3-maps|d3-[a-z]+|topojson-client|iso-3166)[\\/]|world-map\.ts|WorldArtwork\.vue|PassportMap\.vue/;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', 'nuxt-gtag'],
  css: ['~/assets/css/main.css'],
  gtag: {
    // Local development shouldn't show up as site traffic.
    // The measurement ID is set per deployment with NUXT_PUBLIC_GTAG_ID; without one, no tag loads.
    enabled: process.env.NODE_ENV === 'production',
    // plugins/gtag.client.ts loads gtag.js once the page is idle, so it doesn't compete with the first render.
    initMode: 'manual',
  },
  runtimeConfig: {
    // Compose mounts the application here; override for another production storage location.
    passportDataDirectory: '/var/www/.data/passports',
  },
  routeRules: {
    // Pages, API answers, the sitemaps and robots.txt change only with a deployment, which brings the data snapshot.
    // Vercel's CDN keeps each response until the next deployment (its cache key includes the deployment), so the
    // function renders an address once per deployment and region instead of on every request. Browsers still ask the
    // CDN each time. A response that depends on anything else, such as the time or a cookie, must opt out.
    '/**': { headers: { 'vercel-cdn-cache-control': 'public, max-age=31536000' } },
    // The comparison answers with each snapshot's age in days, so it stays out of the cache, as its no-store asks.
    '/api/compare': { headers: { 'vercel-cdn-cache-control': 'no-store' } },
    // Browsers keep the logo and passport covers instead of asking again on every page.
    '/brand/**': { headers: { 'cache-control': 'public, max-age=2592000' } },
    '/covers/**': { headers: { 'cache-control': 'public, max-age=2592000' } },
  },
  nitro: {
    // flag-icons SVGs are served as static files (/flags/1x1/nz.svg, /flags/4x3/nz.svg) instead of being bundled.
    publicAssets: [
      {
        baseURL: 'flags',
        dir: fileURLToPath(new URL('./node_modules/flag-icons/flags', import.meta.url)),
        maxAge: 60 * 60 * 24 * 30,
      },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    $client: {
      build: {
        rolldownOptions: {
          output: {
            // The libraries and the code the pages share go in two files instead of dozens of small ones, each its own
            // request. The world map's code and atlas stay with the pages that draw a map.
            codeSplitting: {
              groups: [
                { name: 'vendor', test: id => /[\\/]node_modules[\\/]/.test(id) && !WORLD_MAP_CODE.test(id) },
                {
                  name: 'shared',
                  test: id =>
                    /[\\/]app[\\/](components|composables|utils)[\\/]|[\\/]shared[\\/]/.test(id) &&
                    !WORLD_MAP_CODE.test(id),
                },
              ],
            },
          },
        },
      },
    },
  },
  compatibilityDate: '2025-04-10',
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Passport Unlock',
      meta: [{ name: 'theme-color', content: '#f8f9f5' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/brand/passport-fold.svg' },
        { rel: 'apple-touch-icon', href: '/brand/apple-touch-icon.png' },
      ],
    },
  },
});
