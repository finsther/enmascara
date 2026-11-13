import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  extractTypeScriptExamples,
  toExecutableModule,
} from './support/readme-examples.js';

const HMAC_KEY_VARIABLE = 'ENMASCARA_HMAC_KEY';
const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const { key: specTestKey } = parse(
  readFileSync(
    new URL('../../../spec/fixtures/strategies.yaml', import.meta.url),
    'utf8',
  ),
) as { readonly key: string };

function readRepositoryReadme(): string {
  const readmeUrl = new URL('../../../README.md', import.meta.url);
  return existsSync(readmeUrl) ? readFileSync(readmeUrl, 'utf8') : '';
}

function runExample(code: string): void {
  execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', toExecutableModule(code)],
    {
      cwd: packageDirectory,
      env: { ...process.env, [HMAC_KEY_VARIABLE]: specTestKey },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
}

describe('extractTypeScriptExamples', () => {
  it('returns each ts block with its starting line', () => {
    const markdown = [
      'Texto',
      '```ts',
      "const a = 'uno';",
      '```',
      '```bash',
      'pnpm add enmascara',
      '```',
      '```ts',
      'a;',
      '```',
    ].join('\n');

    expect(extractTypeScriptExamples(markdown)).toEqual([
      { line: 3, code: "const a = 'uno';" },
      { line: 9, code: 'a;' },
    ]);
  });
});

describe('toExecutableModule', () => {
  it('turns an arrow comment into an assertion on the expression', () => {
    expect(toExecutableModule("redact.text('x'); // → 'y'")).toContain(
      "expectReadmeOutput(redact.text('x'), 'y');",
    );
  });

  it('keeps lines without an arrow comment', () => {
    expect(toExecutableModule("const a = 'uno';")).toContain(
      "const a = 'uno';",
    );
  });

  it('makes a wrong expectation fail', () => {
    expect(() => runExample("'a'.toUpperCase(); // → 'b'")).toThrow();
  });

  it('accepts a right expectation, including null-prototype objects', () => {
    expect(() =>
      runExample('Object.assign(Object.create(null), { a: 1 }); // → { a: 1 }'),
    ).not.toThrow();
  });
});

describe('README examples', () => {
  const examples = extractTypeScriptExamples(readRepositoryReadme());

  it('has examples to check', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  it.each(examples.map((example) => [example.line, example]))(
    'runs the example at line %i',
    (_line, example) => {
      expect(() => runExample(example.code)).not.toThrow();
    },
  );
});
