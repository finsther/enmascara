import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readPublishablePackages } from '../src/workspace-packages.ts';

const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const INSTALLED_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;
const LOCAL_PROTOCOL = /^(?:workspace|file|link):/;

function installedSpecifiers(directory: string): readonly string[] {
  const manifest = JSON.parse(
    readFileSync(join(directory, 'package.json'), 'utf8'),
  ) as Partial<
    Record<(typeof INSTALLED_FIELDS)[number], Readonly<Record<string, string>>>
  >;
  return INSTALLED_FIELDS.flatMap((field) =>
    Object.entries(manifest[field] ?? {}).map(
      ([name, range]) => `${field}.${name}: ${range}`,
    ),
  );
}

describe('publishable manifests', () => {
  const packages = readPublishablePackages(repositoryDirectory);

  it('are the core and its three integrations', () => {
    expect(packages.map(({ name }) => name)).toEqual([
      'enmascara',
      'enmascara-express',
      'enmascara-pino',
      'enmascara-sentry',
    ]);
  });

  it.each(packages.map(({ name, directory }) => [name, directory]))(
    '%s installs nothing from the local workspace',
    (_name, directory) => {
      expect(
        installedSpecifiers(directory).filter((specifier) =>
          LOCAL_PROTOCOL.test(specifier.split(': ')[1] ?? ''),
        ),
      ).toEqual([]);
    },
  );

  it('the check finds a workspace range', () => {
    expect(LOCAL_PROTOCOL.test('workspace:*')).toBe(true);
    expect(LOCAL_PROTOCOL.test('file:../core')).toBe(true);
    expect(LOCAL_PROTOCOL.test('link:../core')).toBe(true);
    expect(LOCAL_PROTOCOL.test('^0.1.0')).toBe(false);
  });
});
