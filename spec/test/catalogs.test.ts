import { describe, expect, it } from 'vitest';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const MEXICAN_STATE_COUNT = 32;
const CARD_LENGTHS_THE_PATTERN_DETECTS = [15, 16];
const BORN_ABROAD_CODE = 'NE';

interface CatalogEntry {
  readonly code: string;
  readonly name: string;
}

interface BankCatalog {
  readonly banks: readonly CatalogEntry[];
}

interface StateCatalog {
  readonly states: readonly CatalogEntry[];
}

interface PrefixRange {
  readonly from: string;
  readonly to: string;
}

interface CardNetwork {
  readonly name: string;
  readonly lengths: readonly number[];
  readonly prefixes: readonly PrefixRange[];
}

interface CardNetworkCatalog {
  readonly networks: readonly CardNetwork[];
}

function codesOf(entries: readonly CatalogEntry[]): readonly string[] {
  return entries.map((entry) => entry.code);
}

function duplicatesIn(values: readonly string[]): readonly string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

describe.each([
  ['banks.yaml', 'banks.schema.json'],
  ['states.yaml', 'states.schema.json'],
  ['card-networks.yaml', 'card-networks.schema.json'],
])('%s', (catalogFile, schemaFile) => {
  it(`conforms to ${schemaFile}`, () => {
    const validateCatalog = compileSchema(schemaFile);

    const conforms = validateCatalog(readYamlDocument(catalogFile));

    expect(conforms, JSON.stringify(validateCatalog.errors)).toBe(true);
  });
});

describe('banks.yaml', () => {
  it('lists every bank code once', () => {
    const catalog = readYamlDocument('banks.yaml') as BankCatalog;

    expect(duplicatesIn(codesOf(catalog.banks))).toEqual([]);
  });
});

describe('states.yaml', () => {
  const catalog = readYamlDocument('states.yaml') as StateCatalog;

  it('lists every state code once', () => {
    expect(duplicatesIn(codesOf(catalog.states))).toEqual([]);
  });

  it('lists the 32 states plus the code for people born abroad', () => {
    const codes = codesOf(catalog.states);

    expect(codes).toContain(BORN_ABROAD_CODE);
    expect(codes).toHaveLength(MEXICAN_STATE_COUNT + 1);
  });
});

describe('card-networks.yaml', () => {
  const catalog = readYamlDocument('card-networks.yaml') as CardNetworkCatalog;
  const ranges = catalog.networks.flatMap((network) => network.prefixes);

  it('names every network once', () => {
    expect(
      duplicatesIn(catalog.networks.map((network) => network.name)),
    ).toEqual([]);
  });

  it('writes both ends of every prefix range with the same number of digits', () => {
    expect(
      ranges.filter((range) => range.from.length !== range.to.length),
    ).toEqual([]);
  });

  it('starts no prefix range after its end', () => {
    expect(
      ranges.filter((range) => Number(range.from) > Number(range.to)),
    ).toEqual([]);
  });

  it('declares only card lengths the card pattern detects', () => {
    const lengths = new Set(
      catalog.networks.flatMap((network) => network.lengths),
    );

    expect(
      [...lengths].filter(
        (length) => !CARD_LENGTHS_THE_PATTERN_DETECTS.includes(length),
      ),
    ).toEqual([]);
  });
});

describe.each([
  ['banks.schema.json', 'banks', { code: '02', name: 'Two digits' }],
  ['banks.schema.json', 'banks', { code: 'ABC', name: 'Letters' }],
  ['states.schema.json', 'states', { code: 'A', name: 'One letter' }],
  ['states.schema.json', 'states', { code: '12', name: 'Digits' }],
])('%s', (schemaFile, listName, entry) => {
  it(`rejects the code ${entry.code}`, () => {
    const validateCatalog = compileSchema(schemaFile);
    const catalog = {
      source: 'https://www.gob.mx',
      retrieved: '2026-10-23',
      [listName]: [entry],
    };

    expect(validateCatalog(catalog)).toBe(false);
  });
});
