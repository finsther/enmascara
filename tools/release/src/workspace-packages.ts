import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PublishablePackage } from './release-plan.ts';

export class InvalidManifestError extends Error {
  override readonly name = 'InvalidManifestError';
}

const PACKAGES_DIRECTORY = 'packages';
const MANIFEST = 'package.json';

interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly peerDependencies: readonly string[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function manifestIn(path: string): Manifest {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (isRecord(parsed)) {
    const { name, version, peerDependencies = {}, private: isPrivate } = parsed;
    if (
      typeof name === 'string' &&
      typeof version === 'string' &&
      isRecord(peerDependencies)
    ) {
      return {
        name,
        version,
        private: isPrivate === true,
        peerDependencies: Object.keys(peerDependencies),
      };
    }
  }
  throw new InvalidManifestError(
    `${path} needs a name, a version and peer dependencies as a record`,
  );
}

export function readPublishablePackages(
  rootDirectory: string,
): readonly PublishablePackage[] {
  const packagesDirectory = join(rootDirectory, PACKAGES_DIRECTORY);
  return readdirSync(packagesDirectory)
    .sort()
    .map((entry) => join(packagesDirectory, entry))
    .filter((directory) => existsSync(join(directory, MANIFEST)))
    .map((directory) => ({
      directory,
      manifest: manifestIn(join(directory, MANIFEST)),
    }))
    .filter(({ manifest }) => !manifest.private)
    .map(({ directory, manifest }) => ({
      name: manifest.name,
      version: manifest.version,
      directory,
      peerDependencies: manifest.peerDependencies,
    }));
}
