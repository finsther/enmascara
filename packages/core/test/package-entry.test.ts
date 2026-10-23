import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface ConditionalEntry {
  readonly types: string;
  readonly default: string;
}

interface PackageManifest {
  readonly exports: {
    readonly '.': {
      readonly import: ConditionalEntry;
      readonly require: ConditionalEntry;
    };
  };
}

type ModuleFormat = 'module' | 'commonjs';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));

function readPackageManifest(): PackageManifest {
  const manifestPath = join(packageDirectory, 'package.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
}

function evaluateInFreshNodeProcess(
  format: ModuleFormat,
  source: string,
): string {
  return execFileSync(
    process.execPath,
    [`--input-type=${format}`, '--eval', source],
    { cwd: packageDirectory, encoding: 'utf8' },
  ).trim();
}

describe('enmascara package entry', () => {
  it('loads through import', () => {
    const output = evaluateInFreshNodeProcess(
      'module',
      "const entry = await import('enmascara'); console.log(typeof entry);",
    );

    expect(output).toBe('object');
  });

  it('loads through require', () => {
    const output = evaluateInFreshNodeProcess(
      'commonjs',
      "console.log(typeof require('enmascara'));",
    );

    expect(output).toBe('object');
  });

  it.each(['import', 'require'] as const)(
    'ships type declarations for %s',
    (condition) => {
      const entry = readPackageManifest().exports['.'][condition];

      expect(existsSync(join(packageDirectory, entry.types))).toBe(true);
    },
  );
});
