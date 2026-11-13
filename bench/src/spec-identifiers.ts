import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const IDENTIFIER_TYPES = ['clabe', 'curp', 'rfc', 'card'] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export interface PlantedIdentifier {
  readonly type: IdentifierType;
  readonly value: string;
}

export interface SpecIdentifiers {
  readonly valid: readonly PlantedIdentifier[];
  readonly lookalikes: readonly string[];
}

interface FixtureFile {
  readonly valid: readonly { readonly value: string }[];
  readonly invalid: readonly {
    readonly value: string;
    readonly reason: string;
  }[];
}

const CHECK_DIGIT_REASON = 'check_digit';

function readFixtureFile(type: IdentifierType): FixtureFile {
  const fixtureUrl = new URL(
    `../../spec/fixtures/${type}.yaml`,
    import.meta.url,
  );
  return parse(readFileSync(fixtureUrl, 'utf8')) as FixtureFile;
}

export function readSpecIdentifiers(): SpecIdentifiers {
  const fixtures = IDENTIFIER_TYPES.map((type) => ({
    type,
    fixture: readFixtureFile(type),
  }));
  return {
    valid: fixtures.flatMap(({ type, fixture }) =>
      fixture.valid.map(({ value }) => ({ type, value })),
    ),
    lookalikes: fixtures.flatMap(({ fixture }) =>
      fixture.invalid
        .filter(({ reason }) => reason === CHECK_DIGIT_REASON)
        .map(({ value }) => value),
    ),
  };
}
