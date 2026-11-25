import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../csp/content-security-policy.ts';
import type { InlineSourceHashes } from '../csp/inline-sources.ts';

const HASHES: InlineSourceHashes = {
  scripts: ['sha256-script'],
  styleAttributes: ['sha256-first-style', 'sha256-second-style'],
};

describe('contentSecurityPolicy', () => {
  it('allows only the same origin by default', () => {
    expect(contentSecurityPolicy(HASHES).directives).toEqual([
      "default-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
    ]);
  });

  it('allows scripts from the same origin, WebAssembly and the listed hashes', () => {
    expect(contentSecurityPolicy(HASHES).scriptDirective).toEqual({
      resources: ["'self'", "'wasm-unsafe-eval'"],
      hashes: ['sha256-script'],
    });
  });

  it('allows style elements from the same origin and only the listed style attributes', () => {
    expect(contentSecurityPolicy(HASHES).styleDirective).toEqual({
      resources: [
        { resource: "'self'", kind: 'element' },
        { resource: "'unsafe-hashes'", kind: 'attribute' },
      ],
      hashes: [
        { hash: 'sha256-first-style', kind: 'attribute' },
        { hash: 'sha256-second-style', kind: 'attribute' },
      ],
    });
  });

  it('never allows inline code without a hash', () => {
    expect(JSON.stringify(contentSecurityPolicy(HASHES))).not.toContain(
      'unsafe-inline',
    );
  });
});
