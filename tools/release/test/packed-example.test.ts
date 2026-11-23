import { describe, expect, it } from 'vitest';
import {
  MissingTarballError,
  packedFileName,
  packedManifest,
  UnreadablePackOutputError,
} from '../src/packed-example.ts';

const TARBALLS: ReadonlyMap<string, string> = new Map([
  ['enmascara', '/tarballs/enmascara-0.1.0.tgz'],
  ['enmascara-pino', '/tarballs/enmascara-pino-0.1.0.tgz'],
]);

describe('packedManifest', () => {
  it('installs the workspace packages from their tarballs', () => {
    expect(
      packedManifest(
        {
          name: 'enmascara-example-pino',
          private: true,
          dependencies: {
            enmascara: 'workspace:*',
            'enmascara-pino': 'workspace:*',
            pino: '10.4.0',
          },
          devDependencies: { '@types/node': '24.19.2' },
        },
        TARBALLS,
      ),
    ).toEqual({
      name: 'enmascara-example-pino',
      private: true,
      dependencies: {
        enmascara: 'file:/tarballs/enmascara-0.1.0.tgz',
        'enmascara-pino': 'file:/tarballs/enmascara-pino-0.1.0.tgz',
        pino: '10.4.0',
      },
      devDependencies: { '@types/node': '24.19.2' },
    });
  });

  it('leaves the original manifest unchanged', () => {
    const manifest = Object.freeze({
      dependencies: Object.freeze({ enmascara: 'workspace:*' }),
    });

    packedManifest(manifest, TARBALLS);

    expect(manifest).toEqual({ dependencies: { enmascara: 'workspace:*' } });
  });

  it('refuses a workspace package that was not packed', () => {
    expect(() =>
      packedManifest(
        { devDependencies: { 'enmascara-sentry': 'workspace:*' } },
        TARBALLS,
      ),
    ).toThrow(
      new MissingTarballError(
        'enmascara-sentry comes from the workspace but was not packed',
      ),
    );
  });

  it('keeps dependency fields that are not records as they are', () => {
    expect(packedManifest({ devDependencies: null }, TARBALLS)).toEqual({
      devDependencies: null,
    });
  });

  it('names its errors', () => {
    expect(new MissingTarballError('').name).toBe('MissingTarballError');
    expect(new UnreadablePackOutputError('').name).toBe(
      'UnreadablePackOutputError',
    );
  });

  it('keeps a manifest without dependencies as it is', () => {
    expect(packedManifest({ name: 'example' }, TARBALLS)).toEqual({
      name: 'example',
    });
  });
});

describe('packedFileName', () => {
  it('reads the tarball name from npm pack', () => {
    expect(
      packedFileName(
        JSON.stringify([
          { id: 'enmascara-pino@0.1.0', filename: 'enmascara-pino-0.1.0.tgz' },
        ]),
      ),
    ).toBe('enmascara-pino-0.1.0.tgz');
  });

  it.each([
    ['output that is not JSON', 'npm notice'],
    ['an empty list', '[]'],
    ['an entry without a file name', '[{"id":"enmascara"}]'],
    ['a file name that is not text', '[{"filename":1}]'],
    ['an entry that is not an object', '["enmascara-pino-0.1.0.tgz"]'],
    ['an empty entry', '[null]'],
    ['an object instead of a list', '{"0":{"filename":"enmascara.tgz"}}'],
  ])('refuses %s', (_case, output) => {
    expect(() => packedFileName(output)).toThrow(
      new UnreadablePackOutputError('npm pack did not report a tarball'),
    );
  });
});
