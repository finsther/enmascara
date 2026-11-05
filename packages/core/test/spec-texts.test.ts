import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createRedactor } from '../src/index.js';

interface TextCase {
  readonly description: string;
  readonly input: string;
  readonly output: string;
}

const texts = parse(
  readFileSync(
    new URL('../../../spec/fixtures/texts.yaml', import.meta.url),
    'utf8',
  ),
) as { readonly cases: readonly TextCase[] };

describe('spec text fixtures', () => {
  const redact = createRedactor();

  it.each(texts.cases.map((textCase) => [textCase.description, textCase]))(
    '%s',
    (_description, textCase) => {
      expect(redact.text(textCase.input)).toBe(textCase.output);
    },
  );
});
