import { describe, expect, it } from 'vitest';
import { maskWith } from '../tools/strategies.ts';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const STRATEGIES = ['redact', 'partial', 'hmac'] as const;
const TYPES = ['clabe', 'curp', 'rfc', 'card'] as const;

interface StrategyCase {
  readonly type: string;
  readonly value: string;
  readonly strategy: (typeof STRATEGIES)[number];
  readonly output: string;
}

interface StrategyFixtures {
  readonly key: string;
  readonly cases: readonly StrategyCase[];
}

const fixtures = readYamlDocument(
  'fixtures/strategies.yaml',
) as StrategyFixtures;
const identifiers = readYamlDocument('identifiers.yaml') as Record<
  string,
  { readonly mask: { readonly partial: { readonly last: number } } }
>;

describe('fixtures/strategies.yaml', () => {
  it('conforms to strategies.schema.json', () => {
    const validateStrategies = compileSchema('strategies.schema.json');

    expect(
      validateStrategies(fixtures),
      JSON.stringify(validateStrategies.errors),
    ).toBe(true);
  });

  it.each(
    fixtures.cases.map((fixture) => [
      fixture.strategy,
      fixture.type,
      fixture.value,
      fixture,
    ]),
  )(
    'masks with %s the %s %j as the reference does',
    (_strategy, _type, _value, fixture) => {
      const visible = identifiers[fixture.type]?.mask.partial.last ?? 0;

      expect(
        maskWith(fixture.strategy, {
          type: fixture.type,
          value: fixture.value,
          visible,
          key: fixtures.key,
        }),
      ).toBe(fixture.output);
    },
  );

  it('uses every strategy on every type', () => {
    const combinations = new Set(
      fixtures.cases.map((fixture) => `${fixture.strategy}:${fixture.type}`),
    );

    expect([...combinations].sort()).toEqual(
      STRATEGIES.flatMap((strategy) =>
        TYPES.map((type) => `${strategy}:${type}`),
      ).sort(),
    );
  });
});
