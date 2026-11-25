import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { contentSecurityPolicy } from './csp/content-security-policy.ts';
import { readInlineSourceHashes } from './csp/inline-sources.ts';
import hashList from './csp-hashes.json' with { type: 'json' };

export default defineConfig({
  output: 'static',
  markdown: { syntaxHighlight: false },
  security: { csp: contentSecurityPolicy(readInlineSourceHashes(hashList)) },
  integrations: [
    starlight({
      title: 'Enmascara',
      customCss: ['./src/styles/fonts.css', './src/styles/tokens.css'],
      defaultLocale: 'root',
      locales: { root: { label: 'Español', lang: 'es' } },
    }),
  ],
});
