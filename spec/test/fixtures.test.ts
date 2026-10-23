import { describe, expect, it } from 'vitest';
import {
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from '../tools/generator/index.ts';
import type { IdentifierType } from '../tools/rules/index.ts';
import {
  type Lookalike,
  lookalikeProblems,
  valueProblems,
} from './support/fixture-problems.ts';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const FIXTURE_TYPES: readonly IdentifierType[] = ['card', 'clabe', 'rfc'];

interface ValidValue {
  readonly value: string;
  readonly source: 'generated' | 'official';
}

interface FixtureFile {
  readonly type: string;
  readonly valid: readonly ValidValue[];
  readonly invalid: readonly InvalidValue[];
  readonly lookalikes: readonly Lookalike[];
}

const validateFixtures = compileSchema('fixtures.schema.json');

function readFixtures(type: IdentifierType): FixtureFile {
  return readYamlDocument(`fixtures/${type}.yaml`) as FixtureFile;
}

describe.each(FIXTURE_TYPES)('fixtures/%s.yaml', (type) => {
  const fixtures = readFixtures(type);

  it('conforms to fixtures.schema.json', () => {
    const conforms = validateFixtures(fixtures);

    expect(conforms, JSON.stringify(validateFixtures.errors)).toBe(true);
  });

  it('declares its own type', () => {
    expect(fixtures.type).toBe(type);
  });

  it('labels every valid and invalid value as the reference rules do', () => {
    const validValues = fixtures.valid.map((fixture) => fixture.value);

    expect(valueProblems(type, validValues, fixtures.invalid)).toEqual([]);
  });

  it('includes at least one value from an official source', () => {
    const officialValues = fixtures.valid.filter(
      (fixture) => fixture.source === 'official',
    );

    expect(officialValues.length).toBeGreaterThan(0);
  });

  it('explains why every lookalike is not the identifier', () => {
    expect(lookalikeProblems(type, fixtures.lookalikes)).toEqual([]);
  });
});

describe('fixtures.schema.json', () => {
  it('rejects a file with fewer than the minimum fixtures', () => {
    const fixtures = readFixtures('clabe');
    const shortened = {
      ...fixtures,
      valid: fixtures.valid.slice(0, MINIMUM_FIXTURES_PER_GROUP - 1),
    };

    expect(validateFixtures(shortened)).toBe(false);
  });

  it('rejects an official value without a reference', () => {
    const fixtures = readFixtures('clabe');
    const unreferenced = {
      ...fixtures,
      valid: fixtures.valid.map((fixture) => ({
        value: fixture.value,
        source: 'official',
      })),
    };

    expect(validateFixtures(unreferenced)).toBe(false);
  });
});
