import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compileSchema, readYamlDocument } from './support/spec-files.ts';

const MVP_IDENTIFIER_TYPES = ['card', 'clabe', 'curp', 'rfc'] as const;

const validateIdentifiers = compileSchema('schema.json');

function identifiersWith(type: string, definition: string): unknown {
  return { [type]: parse(definition) };
}

function definitionShowingLast(validator: string, visible: number): string {
  return [
    "pattern: '[0-9]{18}'",
    `validator: ${validator}`,
    'confidence: high',
    'mask:',
    '  partial:',
    `    last: ${visible}`,
  ].join('\n');
}

function readPatterns(): ReadonlyMap<string, string> {
  const identifiers = readYamlDocument('identifiers.yaml') as Record<
    string,
    { readonly pattern: string }
  >;
  return new Map(
    Object.entries(identifiers).map(([type, definition]) => [
      type,
      definition.pattern,
    ]),
  );
}

describe('identifiers.yaml', () => {
  it('conforms to schema.json', () => {
    const conforms = validateIdentifiers(readYamlDocument('identifiers.yaml'));

    expect(conforms, JSON.stringify(validateIdentifiers.errors)).toBe(true);
  });

  it('declares exactly the MVP identifiers', () => {
    expect([...readPatterns().keys()].sort()).toEqual([
      ...MVP_IDENTIFIER_TYPES,
    ]);
  });

  it.each(MVP_IDENTIFIER_TYPES)(
    'compiles the %s pattern as a Unicode regular expression',
    (type) => {
      const pattern = readPatterns().get(type) ?? '';

      expect(() => new RegExp(pattern, 'u')).not.toThrow();
    },
  );
});

describe('schema.json', () => {
  it('accepts a complete identifier definition', () => {
    const definition = definitionShowingLast('clabe_checksum', 4);

    expect(validateIdentifiers(identifiersWith('clabe', definition))).toBe(
      true,
    );
  });

  it.each([
    ['curp', 'curp_checksum', 3],
    ['rfc', 'rfc_checksum', 3],
    ['clabe', 'clabe_checksum', 5],
    ['card', 'card_checksum', 5],
  ])(
    'rejects a %s partial mask checked by %s showing %i characters',
    (type, validator, visible) => {
      const definition = definitionShowingLast(validator, visible);

      expect(validateIdentifiers(identifiersWith(type, definition))).toBe(
        false,
      );
    },
  );

  it('rejects a validator name outside the contract', () => {
    const definition = definitionShowingLast('regex_only', 4);

    expect(validateIdentifiers(identifiersWith('clabe', definition))).toBe(
      false,
    );
  });

  it('rejects properties outside the contract', () => {
    const definition = `${definitionShowingLast('clabe_checksum', 4)}\nscript: 'eval()'`;

    expect(validateIdentifiers(identifiersWith('clabe', definition))).toBe(
      false,
    );
  });

  it('rejects an empty allowlist entry', () => {
    const definition = `${definitionShowingLast('rfc_checksum', 2)}\nallowlist: ['']`;

    expect(validateIdentifiers(identifiersWith('rfc', definition))).toBe(false);
  });
});
