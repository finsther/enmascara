import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  markdown: { syntaxHighlight: false },
  integrations: [
    starlight({
      title: 'Enmascara',
      customCss: ['./src/styles/tokens.css'],
      defaultLocale: 'root',
      locales: { root: { label: 'Español', lang: 'es' } },
    }),
  ],
});
