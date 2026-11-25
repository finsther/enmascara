import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inlineSourceHashes } from '../csp/inline-sources.ts';
import { builtFiles, readBuilt } from './support/build-output.ts';

const POLICY_META =
  /<meta http-equiv="content-security-policy" content="([^"]*)"/;
const REGENERATE = 'run pnpm --filter enmascara-site csp:hashes and review it';

interface BuiltPage {
  readonly path: string;
  readonly html: string;
  readonly policy: string;
}

function builtPages(): readonly BuiltPage[] {
  return builtFiles('.html').map((path) => {
    const html = readBuilt(path);
    return { path, html, policy: POLICY_META.exec(html)?.[1] ?? '' };
  });
}

function directive(policy: string, name: string): readonly string[] {
  const found = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name);
  return found?.slice(1) ?? [];
}

function quoted(hash: string): string {
  return `'${hash}'`;
}

describe('the built content security policy', () => {
  it('is declared on every page', () => {
    const pages = builtPages();

    expect(pages.length).toBeGreaterThan(0);
    expect(
      pages.filter(({ policy }) => policy === '').map(({ path }) => path),
    ).toEqual([]);
  });

  it('never allows inline code without a hash', () => {
    expect(
      builtPages()
        .filter(({ policy }) => policy.includes("'unsafe-inline'"))
        .map(({ path }) => path),
    ).toEqual([]);
  });

  it('allows every inline script of each page by its hash', () => {
    const missing = builtPages().flatMap(({ path, html, policy }) =>
      inlineSourceHashes([html])
        .scripts.filter(
          (hash) => !directive(policy, 'script-src').includes(quoted(hash)),
        )
        .map((hash) => `${path}: ${hash}`),
    );

    expect(missing).toEqual([]);
  });

  it('allows every style attribute of each page by its hash', () => {
    const missing = builtPages().flatMap(({ path, html, policy }) =>
      inlineSourceHashes([html])
        .styleAttributes.filter(
          (hash) => !directive(policy, 'style-src-attr').includes(quoted(hash)),
        )
        .map((hash) => `${path}: ${hash}`),
    );

    expect(missing).toEqual([]);
  });
});

describe('csp-hashes.json', () => {
  it(`lists exactly the inline sources of the build (${REGENERATE})`, () => {
    const listed: unknown = JSON.parse(
      readFileSync(new URL('../csp-hashes.json', import.meta.url), 'utf8'),
    );

    expect(listed).toEqual(
      inlineSourceHashes(builtPages().map(({ html }) => html)),
    );
  });
});
