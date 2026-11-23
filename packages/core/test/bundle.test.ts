import { describe, expect, it } from 'vitest';
import {
  BUNDLES,
  moduleSpecifiers,
  networkApis,
  readBundle,
} from './support/bundle-scanners.js';

const packageUrl = new URL('..', import.meta.url);

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
  const source = readBundle(packageUrl, fileName);

  it('imports no module at all', () => {
    expect(moduleSpecifiers(source)).toEqual([]);
  });

  it('uses no network API', () => {
    expect(networkApis(source)).toEqual([]);
  });
});
