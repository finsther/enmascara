import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const BUNDLES = ['index.js', 'index.cjs'] as const;
const MODULE_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;
const NETWORK_APIS =
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/g;

function readBundle(fileName: string): string {
  return readFileSync(new URL(`../dist/${fileName}`, import.meta.url), 'utf8');
}

describe.each(BUNDLES)('dist/%s', (fileName) => {
  const source = readBundle(fileName);

  it('imports no module, so Express, pino-http and morgan stay the application’s', () => {
    expect(
      [...source.matchAll(MODULE_SPECIFIER)].map((match) => match[1]),
    ).toEqual([]);
  });

  it('uses no network API', () => {
    expect([...source.matchAll(NETWORK_APIS)].map((match) => match[0])).toEqual(
      [],
    );
  });
});
