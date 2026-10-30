import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createDefaultValidatorRegistry } from '../../src/validators/validator-registry.js';

const SPEC_DIRECTORY = new URL('../../../../spec/', import.meta.url);
const TYPES_WITH_VALIDATORS = ['clabe', 'card'] as const;

interface IdentifierDefinition {
  readonly pattern: string;
  readonly validator: string;
}

interface FixtureFile {
  readonly valid: readonly { readonly value: string }[];
  readonly invalid: readonly { readonly value: string }[];
  readonly lookalikes: readonly { readonly text: string }[];
}

function readSpecYaml(fileName: string): unknown {
  return parse(readFileSync(new URL(fileName, SPEC_DIRECTORY), 'utf8'));
}

const identifiers = readSpecYaml('identifiers.yaml') as Record<
  string,
  IdentifierDefinition
>;
const registry = createDefaultValidatorRegistry();

describe.each(TYPES_WITH_VALIDATORS)('spec fixtures for %s', (type) => {
  const definition = identifiers[type] ?? { pattern: '', validator: '' };
  const fixtures = readSpecYaml(`fixtures/${type}.yaml`) as FixtureFile;
  const validator = registry.validatorFor(definition.validator);

  it('accepts every valid value', () => {
    expect(
      fixtures.valid.filter((fixture) => !validator.isValid(fixture.value)),
    ).toEqual([]);
  });

  it('rejects every invalid value', () => {
    expect(
      fixtures.invalid.filter((fixture) => validator.isValid(fixture.value)),
    ).toEqual([]);
  });

  it('rejects every pattern match inside the lookalikes', () => {
    const matches = fixtures.lookalikes.flatMap((lookalike) =>
      [...lookalike.text.matchAll(new RegExp(definition.pattern, 'gu'))].map(
        (match) => match[0],
      ),
    );

    expect(matches.filter((candidate) => validator.isValid(candidate))).toEqual(
      [],
    );
  });
});
