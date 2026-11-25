import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineSourceHashes } from '../csp/inline-sources.ts';

const buildDirectory = fileURLToPath(new URL('../dist', import.meta.url));
const hashesPath = fileURLToPath(
  new URL('../csp-hashes.json', import.meta.url),
);
const JSON_INDENTATION = 2;

const documents = readdirSync(buildDirectory, {
  recursive: true,
  encoding: 'utf8',
})
  .filter((path) => path.endsWith('.html'))
  .map((path) => readFileSync(join(buildDirectory, path), 'utf8'));

writeFileSync(
  hashesPath,
  `${JSON.stringify(inlineSourceHashes(documents), null, JSON_INDENTATION)}\n`,
);
