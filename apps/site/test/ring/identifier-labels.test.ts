import { describe, expect, it } from 'vitest';
import {
  IDENTIFIER_TYPES,
  identifierLabel,
} from '../../src/ring/identifier-labels.ts';

describe('IDENTIFIER_TYPES', () => {
  it('lists the types in the order the ring shows them', () => {
    expect(IDENTIFIER_TYPES).toEqual(['clabe', 'curp', 'rfc', 'card']);
  });
});

describe('identifierLabel', () => {
  it('names each type as the ring shows it', () => {
    expect(IDENTIFIER_TYPES.map(identifierLabel)).toEqual([
      'CLABE',
      'CURP',
      'RFC',
      'Tarjeta',
    ]);
  });

  it('writes an unknown type in capitals', () => {
    expect(identifierLabel('nss')).toBe('NSS');
  });
});
