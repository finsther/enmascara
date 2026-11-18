import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  extractTypeScriptExamples,
  toExecutableModule,
} from './readme-examples.js';

interface PackageManifest {
  readonly name?: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly repository?: unknown;
  readonly bugs?: unknown;
  readonly publishConfig?: unknown;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly peerDependenciesMeta?: Readonly<
    Record<string, { readonly optional?: boolean }>
  >;
}

interface PackDryRun {
  readonly files: readonly { readonly path: string }[];
}

export interface IntegrationPackage {
  readonly directory: string;
  readonly sdk: string;
  readonly optionalPeers?: readonly string[];
}

const repositoryDirectory = fileURLToPath(
  new URL('../../../..', import.meta.url),
);
const REPOSITORY_URL = 'https://github.com/finsther/enmascara';
const README = 'README.md';
const LICENSE = 'LICENSE';
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
const PUBLISHED_FILES = [
  LICENSE,
  README,
  'dist/index.cjs',
  'dist/index.d.cts',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
] as const;

function readText(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function readManifest(packageDirectory: string): PackageManifest {
  return JSON.parse(
    readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
  ) as PackageManifest;
}

function packedFiles(packageDirectory: string): readonly string[] {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const [packResult] = JSON.parse(output) as readonly PackDryRun[];
  return (packResult?.files ?? []).map(({ path }) => path).sort();
}

function runExample(packageDirectory: string, code: string): void {
  execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', toExecutableModule(code)],
    { cwd: packageDirectory, stdio: ['ignore', 'ignore', 'pipe'] },
  );
}

export function describeIntegrationPackage(
  integration: IntegrationPackage,
): void {
  const packageDirectory = join(repositoryDirectory, integration.directory);
  const manifest = readManifest(packageDirectory);
  const readme = readText(join(packageDirectory, README));
  const optionalPeers = integration.optionalPeers ?? [];

  describe(`${manifest.name ?? integration.directory} as published`, () => {
    it('points provenance and its page at the GitHub repository', () => {
      expect(manifest.repository).toEqual({
        type: 'git',
        url: `git+${REPOSITORY_URL}.git`,
        directory: integration.directory,
      });
      expect(manifest.homepage).toBe(
        `${REPOSITORY_URL}/tree/main/${integration.directory}#readme`,
      );
      expect(manifest.bugs).toEqual({ url: `${REPOSITORY_URL}/issues` });
    });

    it('publishes publicly with provenance under the MIT license', () => {
      expect(manifest.publishConfig).toEqual({
        access: 'public',
        provenance: true,
      });
      expect(manifest.license).toBe('MIT');
    });

    it('leaves enmascara and the SDK to the application', () => {
      expect(manifest.dependencies).toBeUndefined();
      expect(Object.keys(manifest.peerDependencies ?? {}).sort()).toEqual(
        ['enmascara', integration.sdk, ...optionalPeers].sort(),
      );
    });

    it('marks as optional only the peers the application may leave out', () => {
      expect(manifest.peerDependenciesMeta ?? {}).toEqual(
        Object.fromEntries(
          optionalPeers.map((peer) => [peer, { optional: true }]),
        ),
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

    it('contains only the bundles, their types, the README and the license', () => {
      expect(packedFiles(packageDirectory)).toEqual([...PUBLISHED_FILES]);
    });

    it('ships the repository license unchanged', () => {
      expect(readText(join(packageDirectory, LICENSE))).toBe(
        readText(join(repositoryDirectory, LICENSE)),
      );
    });

    it('has README examples to check', () => {
      expect(extractTypeScriptExamples(readme).length).toBeGreaterThan(0);
    });

    it.each(
      extractTypeScriptExamples(readme).map((example) => [
        example.line,
        example,
      ]),
    )('runs the README example at line %i', (_line, example) => {
      expect(() => runExample(packageDirectory, example.code)).not.toThrow();
    });
  });
}
