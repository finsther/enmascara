import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  markdown: { syntaxHighlight: false },
  integrations: [
    starlight({
      title: 'Enmascara',
      defaultLocale: 'root',
      locales: { root: { label: 'Español', lang: 'es' } },
    }),
  ],
});
