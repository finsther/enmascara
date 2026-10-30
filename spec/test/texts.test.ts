import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const MINIMUM_TEXT_CASES = 20;
const INVISIBLE_OR_SPACE_LIKE_CHARACTERS =
  /[\u00A0\u00AD\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/u;

interface TextCase {
  readonly description: string;
  readonly input: string;
  readonly output: string;
}

interface TextCases {
  readonly cases: readonly TextCase[];
}

describe('fixtures/texts.yaml', () => {
  const texts = readYamlDocument('fixtures/texts.yaml') as TextCases;

  it('conforms to texts.schema.json', () => {
    const validateTexts = compileSchema('texts.schema.json');

    expect(validateTexts(texts), JSON.stringify(validateTexts.errors)).toBe(
      true,
    );
  });

  it(`has at least ${MINIMUM_TEXT_CASES} cases`, () => {
    expect(texts.cases.length).toBeGreaterThanOrEqual(MINIMUM_TEXT_CASES);
  });

  it('writes invisible characters as escapes a reviewer can read', () => {
    const rawFile = readFileSync(
      new URL('../fixtures/texts.yaml', import.meta.url),
      'utf8',
    );

    expect(INVISIBLE_OR_SPACE_LIKE_CHARACTERS.test(rawFile)).toBe(false);
  });

  it('describes every case once', () => {
    const descriptions = texts.cases.map((textCase) => textCase.description);

    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
