import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const buildDirectory = fileURLToPath(
  new URL('../../dist', import.meta.url),
);

export function builtFiles(extension: string): readonly string[] {
  if (!existsSync(buildDirectory)) {
    throw new Error(
      'apps/site/dist is missing: run pnpm --filter enmascara-site build first',
    );
  }
  return readdirSync(buildDirectory, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith(extension))
    .sort();
}

export function readBuilt(path: string): string {
  return readFileSync(join(buildDirectory, path), 'utf8');
}
