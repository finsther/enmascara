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

function moduleSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(MODULE_SPECIFIER)].map((match) => match[1] ?? '');
}

function networkApis(source: string): readonly string[] {
  return [...source.matchAll(NETWORK_APIS)].map((match) => match[0]);
}

describe('bundle scanners', () => {
  it('find every kind of module import', () => {
    const sample = [
      "import http from 'node:http';",
      'import "net";',
      "const tls = require('tls');",
      "await import('dns');",
      "export { x } from './local.js';",
    ].join('\n');

    expect(moduleSpecifiers(sample)).toEqual([
      'node:http',
      'net',
      'tls',
      'dns',
      './local.js',
    ]);
  });

  it('find network APIs', () => {
    expect(
      networkApis('fetch(url); new WebSocket(url); navigator.sendBeacon(url);'),
    ).toEqual(['fetch', 'WebSocket', 'sendBeacon']);
  });
});

describe.each(BUNDLES)('dist/%s', (fileName) => {
  const source = readBundle(fileName);

  it('imports no module at all', () => {
    expect(moduleSpecifiers(source)).toEqual([]);
  });

  it('uses no network API', () => {
    expect(networkApis(source)).toEqual([]);
  });
});
