import { describe, expect, it } from 'vitest';
import {
  BUNDLES,
  moduleSpecifiers,
  networkApis,
  readBundle,
} from '../../core/test/support/bundle-scanners.js';

const packageUrl = new URL('..', import.meta.url);

describe.each(BUNDLES)('dist/%s', (fileName) => {
  const source = readBundle(packageUrl, fileName);

  it('imports no module, so Express, pino-http and morgan stay the application’s', () => {
    expect(moduleSpecifiers(source)).toEqual([]);
  });

  it('uses no network API', () => {
    expect(networkApis(source)).toEqual([]);
  });
});
