// @ts-check
import prettier from 'eslint-config-prettier/flat';
import withNuxt from './.nuxt/eslint.config.mjs';

// Prettier owns formatting (`prettier --check` runs in `yarn lint`), so its config switches off the
// stylistic rules that would disagree with it.
export default withNuxt(prettier, {
  rules: {
    'no-console': 'warn',
    'no-debugger': 'warn',
    'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    'vue/block-lang': ['error', { script: { lang: 'ts' } }],
  },
});
