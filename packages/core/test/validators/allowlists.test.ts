import { describe, expect, it } from 'vitest';
import { allowlistFor } from '../../src/validators/allowlists.js';

const DEFINITIONS = [
  { validator: 'rfc_checksum', allowlist: ['XAXX010101000', 'XEXX010101000'] },
  { validator: 'clabe_checksum' },
];

describe('allowlistFor', () => {
  it('collects the allowlist declared for the validator', () => {
    expect(allowlistFor('rfc_checksum', DEFINITIONS)).toEqual(
      new Set(['XAXX010101000', 'XEXX010101000']),
    );
  });

  it('gives an empty allowlist to a validator that declares none', () => {
    expect(allowlistFor('clabe_checksum', DEFINITIONS)).toEqual(new Set());
  });

  it('gives an empty allowlist to a validator that is not defined', () => {
    expect(allowlistFor('card_checksum', DEFINITIONS)).toEqual(new Set());
  });
});
