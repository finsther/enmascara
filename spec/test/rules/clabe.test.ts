import { describe, expect, it } from 'vitest';
import { clabeRejection } from '../../tools/rules/clabe.js';

const KNOWN_BANK_CODES: ReadonlySet<string> = new Set(['002']);

describe('clabeRejection', () => {
  it('accepts the Banxico worked example', () => {
    expect(clabeRejection('002180032240946700', KNOWN_BANK_CODES)).toBe(
      undefined,
    );
  });

  it('rejects a wrong check digit', () => {
    expect(clabeRejection('002180032240946701', KNOWN_BANK_CODES)).toBe(
      'check_digit',
    );
  });

  it('rejects a bank code outside the catalog', () => {
    expect(clabeRejection('999180032240946703', KNOWN_BANK_CODES)).toBe(
      'bank_code',
    );
  });
});
