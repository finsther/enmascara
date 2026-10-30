import { describe, expect, it } from 'vitest';
import { createClabeValidator } from '../../src/validators/clabe-validator.js';

const BANXICO_EXAMPLE = '002180032240946700';
const KNOWN_BANK_CODES: ReadonlySet<string> = new Set(['002']);

describe('createClabeValidator', () => {
  const validator = createClabeValidator(KNOWN_BANK_CODES);

  it('accepts the Banxico worked example', () => {
    expect(validator.isValid(BANXICO_EXAMPLE)).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(validator.isValid('002180032240946701')).toBe(false);
  });

  it('rejects a bank code outside the catalog', () => {
    expect(validator.isValid('999180032240946703')).toBe(false);
  });

  it.each([
    ['', 'empty text'],
    ['00218003224094670', '17 digits'],
    ['0021800322409467000', '19 digits'],
    ['00218003224094670A', 'a letter in place of the check digit'],
    ['００２180032240946700', 'full-width digits'],
    [' 002180032240946700', 'a leading space'],
  ])('rejects %j (%s)', (candidate) => {
    expect(validator.isValid(candidate)).toBe(false);
  });
});
