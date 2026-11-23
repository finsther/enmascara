import { describe, expect, it } from 'vitest';
import {
  BUNDLES,
  moduleSpecifiers,
  networkApis,
  readBundle,
} from '../../core/test/support/bundle-scanners.js';

const packageUrl = new URL('..', import.meta.url);
const PEER_SDK = '@sentry/node';

describe.each(BUNDLES)('dist/%s', (fileName) => {
  const source = readBundle(packageUrl, fileName);

  it('imports only the Sentry SDK the application installs', () => {
    expect(new Set(moduleSpecifiers(source))).toEqual(new Set([PEER_SDK]));
  });

  it('uses no network API', () => {
    expect(networkApis(source)).toEqual([]);
  });
});
