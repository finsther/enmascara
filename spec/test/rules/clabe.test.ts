import { describe, expect, it } from 'vitest';
import { clabeRejection } from '../../tools/rules/clabe.ts';

const KNOWN_BANK_CODES: ReadonlySet<string> = new Set(['002']);

describe('clabeRejection', () => {
  it('accepts the Banxico worked example', () => {
    expect(clabeRejection('002180032240946700', KNOWN_BANK_CODES)).toBe(
      undefined,
    );
  });

  it('accepts the Banxico example with dashes or spaces between digits', () => {
    expect(clabeRejection('002-180-03224094670-0', KNOWN_BANK_CODES)).toBe(
      undefined,
    );
    expect(clabeRejection('002 180 03224094670 0', KNOWN_BANK_CODES)).toBe(
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
