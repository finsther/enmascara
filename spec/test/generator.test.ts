import { describe, expect, it } from 'vitest';
import {
  type GeneratedValues,
  generateFixtureValues,
  MINIMUM_FIXTURES_PER_GROUP,
} from '../tools/generator/index.ts';
import type { IdentifierType } from '../tools/rules/index.ts';
import { readBankCodes, valueProblems } from './support/fixture-problems.ts';

const GENERATED_TYPES: readonly IdentifierType[] = ['card', 'clabe', 'rfc'];
const REJECTIONS_BY_TYPE: Readonly<Record<string, readonly string[]>> = {
  card: ['check_digit', 'network_prefix'],
  clabe: ['bank_code', 'check_digit'],
  rfc: ['check_digit', 'date'],
};
const SEED = 20261023;
const OTHER_SEED = 7;

function generate(
  type: IdentifierType,
  seed: number,
  bankCodes: ReadonlySet<string> = readBankCodes(),
): GeneratedValues {
  return generateFixtureValues(type, { seed, bankCodes });
}

function reversed(values: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...values].reverse());
}

describe.each(GENERATED_TYPES)('generateFixtureValues for %s', (type) => {
  it('produces exactly the minimum number of valid and invalid values', () => {
    const generated = generate(type, SEED);

    expect(generated.valid).toHaveLength(MINIMUM_FIXTURES_PER_GROUP);
    expect(generated.invalid).toHaveLength(MINIMUM_FIXTURES_PER_GROUP);
  });

  it('produces values that pass the reference rules as labelled', () => {
    const generated = generate(type, SEED);

    expect(valueProblems(type, generated.valid, generated.invalid)).toEqual([]);
  });

  it('splits invalid values evenly across the rejection reasons', () => {
    const generated = generate(type, SEED);
    const reasons = new Set(generated.invalid.map((fixture) => fixture.reason));

    expect([...reasons].sort()).toEqual(REJECTIONS_BY_TYPE[type]);
    expect(
      generated.invalid.filter((fixture) => fixture.reason === 'check_digit'),
    ).toHaveLength(MINIMUM_FIXTURES_PER_GROUP / reasons.size);
  });

  it('produces the same values for the same seed', () => {
    expect(generate(type, SEED)).toEqual(generate(type, SEED));
  });

  it('produces the same values whatever the order of the bank codes', () => {
    expect(generate(type, SEED, reversed(readBankCodes()))).toEqual(
      generate(type, SEED),
    );
  });

  it('produces different values for a different seed', () => {
    expect(generate(type, OTHER_SEED).valid).not.toEqual(
      generate(type, SEED).valid,
    );
  });
});
