import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import ajvFormats from 'ajv-formats';
import { parse } from 'yaml';

const specDirectory = fileURLToPath(new URL('../..', import.meta.url));

function readSpecFile(relativePath: string): string {
  return readFileSync(join(specDirectory, relativePath), 'utf8');
}

export function readYamlDocument(relativePath: string): unknown {
  return parse(readSpecFile(relativePath));
}

export function compileSchema(relativePath: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajvFormats.default(ajv);
  return ajv.compile(JSON.parse(readSpecFile(relativePath)));
}
