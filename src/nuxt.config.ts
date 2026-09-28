import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  compatibilityDate: '2025-04-10',
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Passport Unlock',
    },
  },
});
