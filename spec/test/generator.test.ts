import { describe, expect, it } from 'vitest';
import {
  type GeneratedValues,
  generateFixtureValues,
  MINIMUM_FIXTURES_PER_GROUP,
} from '../tools/generator/index.js';
import type { IdentifierType } from '../tools/rules/index.js';
import { readBankCodes, valueProblems } from './support/fixture-problems.js';

const GENERATED_TYPES: readonly IdentifierType[] = ['card', 'clabe', 'rfc'];
const REJECTIONS_BY_TYPE: Readonly<Record<string, readonly string[]>> = {
  card: ['check_digit', 'network_prefix'],
  clabe: ['bank_code', 'check_digit'],
  rfc: ['check_digit', 'date'],
};
const SEED = 20261023;
const OTHER_SEED = 7;

function generate(type: IdentifierType, seed: number): GeneratedValues {
  return generateFixtureValues(type, { seed, bankCodes: readBankCodes() });
}

describe.each(GENERATED_TYPES)('generateFixtureValues for %s', (type) => {
  const generated = generate(type, SEED);

  it('produces the minimum number of valid and invalid values', () => {
    expect(generated.valid.length).toBeGreaterThanOrEqual(
      MINIMUM_FIXTURES_PER_GROUP,
    );
    expect(generated.invalid.length).toBeGreaterThanOrEqual(
      MINIMUM_FIXTURES_PER_GROUP,
    );
  });

  it('produces values that pass the reference rules as labelled', () => {
    expect(valueProblems(type, generated.valid, generated.invalid)).toEqual([]);
  });

  it('covers every rejection reason of the type', () => {
    const reasons = new Set(generated.invalid.map((fixture) => fixture.reason));

    expect([...reasons].sort()).toEqual(REJECTIONS_BY_TYPE[type]);
  });

  it('produces the same values for the same seed', () => {
    expect(generate(type, SEED)).toEqual(generated);
  });

  it('produces different values for a different seed', () => {
    expect(generate(type, OTHER_SEED).valid).not.toEqual(generated.valid);
  });
});
