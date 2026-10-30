import { describe, expect, it } from 'vitest';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const MINIMUM_TEXT_CASES = 20;

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

  it('describes every case once', () => {
    const descriptions = texts.cases.map((textCase) => textCase.description);

    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
