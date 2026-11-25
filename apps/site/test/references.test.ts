import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDirectory,
  builtFiles,
  readBuilt,
} from './support/build-output.ts';

const LOCAL_REFERENCE = /\s(?:href|src)="(\/(?!\/)[^"#?]*)/g;
const INDEX_FILE = 'index.html';

function existsInBuild(path: string): boolean {
  const target = path.endsWith('/') ? `${path}${INDEX_FILE}` : path;
  return existsSync(join(buildDirectory, decodeURI(target)));
}

describe('built pages', () => {
  it('reference only files that exist in the build', () => {
    const missing = builtFiles('.html').flatMap((page) =>
      [...readBuilt(page).matchAll(LOCAL_REFERENCE)]
        .map(([, path = '']) => path)
        .filter((path) => !existsInBuild(path))
        .map((path) => `${page}: ${path}`),
    );

    expect(missing).toEqual([]);
  });
});
