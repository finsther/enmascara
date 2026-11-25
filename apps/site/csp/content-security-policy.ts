import type { AstroUserConfig } from 'astro';
import type { InlineSourceHashes } from './inline-sources.ts';

type ContentSecurityPolicy = Exclude<
  NonNullable<AstroUserConfig['security']>['csp'],
  boolean | undefined
>;

type Directive = NonNullable<ContentSecurityPolicy['directives']>[number];

const SAME_ORIGIN_DIRECTIVES: readonly Directive[] = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
];

export function contentSecurityPolicy(
  hashes: InlineSourceHashes,
): ContentSecurityPolicy {
  return {
    directives: [...SAME_ORIGIN_DIRECTIVES],
    scriptDirective: {
      resources: ["'self'", "'wasm-unsafe-eval'"],
      hashes: [...hashes.scripts],
    },
    styleDirective: {
      resources: [
        { resource: "'self'", kind: 'element' },
        { resource: "'unsafe-hashes'", kind: 'attribute' },
      ],
      hashes: hashes.styleAttributes.map((hash) => ({
        hash,
        kind: 'attribute',
      })),
    },
  };
}
