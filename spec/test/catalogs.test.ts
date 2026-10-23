import { describe, expect, it } from 'vitest';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const MEXICAN_STATE_COUNT = 32;
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

function codesOf(entries: readonly CatalogEntry[]): readonly string[] {
  return entries.map((entry) => entry.code);
}

function duplicatesIn(values: readonly string[]): readonly string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

describe.each([
  ['banks.yaml', 'banks.schema.json'],
  ['states.yaml', 'states.schema.json'],
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
