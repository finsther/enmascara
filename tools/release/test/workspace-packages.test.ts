import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  InvalidManifestError,
  readPublishablePackages,
} from '../src/workspace-packages.ts';

function workspaceWith(manifests: Readonly<Record<string, unknown>>): string {
  const root = mkdtempSync(join(tmpdir(), 'enmascara-release-'));
  for (const [directory, manifest] of Object.entries(manifests)) {
    mkdirSync(join(root, 'packages', directory), { recursive: true });
    writeFileSync(
      join(root, 'packages', directory, 'package.json'),
      JSON.stringify(manifest),
    );
  }
  return root;
}

describe('readPublishablePackages', () => {
  it('reads every package under packages that is not private', () => {
    const root = workspaceWith({
      core: { name: 'enmascara', version: '0.1.0' },
      pino: {
        name: 'enmascara-pino',
        version: '0.0.0',
        peerDependencies: { enmascara: '^0.1.0', pino: '^10.0.0' },
      },
      internal: { name: 'internal', version: '1.0.0', private: true },
    });

    expect(readPublishablePackages(root)).toEqual([
      {
        name: 'enmascara',
        version: '0.1.0',
        directory: join(root, 'packages', 'core'),
        peerDependencies: [],
      },
      {
        name: 'enmascara-pino',
        version: '0.0.0',
        directory: join(root, 'packages', 'pino'),
        peerDependencies: ['enmascara', 'pino'],
      },
    ]);
  });

  it('ignores files next to the packages', () => {
    const root = workspaceWith({
      core: { name: 'enmascara', version: '0.1.0' },
    });
    writeFileSync(join(root, 'packages', 'README.md'), '');

    expect(readPublishablePackages(root).map(({ name }) => name)).toEqual([
      'enmascara',
    ]);
  });

  it('names its errors', () => {
    expect(new InvalidManifestError('').name).toBe('InvalidManifestError');
  });

  it.each([
    ['without a name', { version: '0.1.0' }],
    ['without a version', { name: 'enmascara' }],
    [
      'with peers that are not a record',
      { name: 'a', version: '1.0.0', peerDependencies: [] },
    ],
    ['that is not an object', ['enmascara']],
  ])('rejects a manifest %s', (_case, manifest) => {
    const root = workspaceWith({ broken: manifest });

    expect(() => readPublishablePackages(root)).toThrow(
      new InvalidManifestError(
        `${join(root, 'packages', 'broken', 'package.json')} needs a name, a version and peer dependencies as a record`,
      ),
    );
  });
});
