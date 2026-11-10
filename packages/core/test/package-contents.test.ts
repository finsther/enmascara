import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  readonly license?: string;
  readonly homepage?: string;
  readonly keywords?: readonly string[];
  readonly repository?: unknown;
  readonly bugs?: unknown;
  readonly publishConfig?: unknown;
  readonly scripts?: Readonly<Record<string, string>>;
}

interface PackDryRun {
  readonly files: readonly { readonly path: string }[];
}

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const REPOSITORY_URL = 'https://github.com/finsther/enmascara';
const LIFECYCLE_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'preprepare',
  'postprepare',
  'prepack',
  'postpack',
  'prepublish',
  'prepublishOnly',
  'publish',
  'postpublish',
] as const;

function readManifest(): PackageManifest {
  return JSON.parse(
    readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
  ) as PackageManifest;
}

function packedFiles(): readonly string[] {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const [packResult] = JSON.parse(output) as readonly PackDryRun[];
  return (packResult?.files ?? []).map(({ path }) => path).sort();
}

describe('published package metadata', () => {
  const manifest = readManifest();

  it('points provenance at the GitHub repository', () => {
    expect(manifest.repository).toEqual({
      type: 'git',
      url: `git+${REPOSITORY_URL}.git`,
      directory: 'packages/core',
    });
    expect(manifest.homepage).toBe(`${REPOSITORY_URL}#readme`);
    expect(manifest.bugs).toEqual({ url: `${REPOSITORY_URL}/issues` });
  });

  it('publishes publicly with provenance under the MIT license', () => {
    expect(manifest.publishConfig).toEqual({
      access: 'public',
      provenance: true,
    });
    expect(manifest.license).toBe('MIT');
  });

  it('is found by the identifiers it detects', () => {
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(['clabe', 'curp', 'rfc', 'pii', 'redaction']),
    );
  });

  it('runs no lifecycle script on install or publish', () => {
    const scriptNames = Object.keys(manifest.scripts ?? {});

    expect(
      scriptNames.filter((name) =>
        LIFECYCLE_SCRIPTS.some((lifecycle) => lifecycle === name),
      ),
    ).toEqual([]);
  });
});

describe('published package contents', () => {
  it('contains only the bundles, their types, the README and the license', () => {
    expect(packedFiles()).toEqual([
      'LICENSE',
      'README.md',
      'dist/index.cjs',
      'dist/index.d.cts',
      'dist/index.d.ts',
      'dist/index.js',
      'package.json',
    ]);
  });

  it.each(['README.md', 'LICENSE'])(
    'ships the repository %s unchanged',
    (fileName) => {
      expect(readFileSync(join(packageDirectory, fileName), 'utf8')).toBe(
        readFileSync(join(repositoryDirectory, fileName), 'utf8'),
      );
    },
  );
});
