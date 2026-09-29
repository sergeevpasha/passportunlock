import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

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
