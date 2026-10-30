import { describe, expect, it } from 'vitest';
import { createCurpValidator } from '../../src/validators/curp-validator.js';

const KNOWN_STATE_CODES: ReadonlySet<string> = new Set(['DF', 'NE']);

describe('createCurpValidator', () => {
  const validator = createCurpValidator(KNOWN_STATE_CODES);

  it.each([
    ['GODE561231HDFRRN00', 'born in 1956'],
    ['LOOA011231XNEPPRA6', 'born abroad in 2001, sex X'],
    ['GODE000229HDFRRNA8', 'February 29, 2000'],
  ])('accepts %s (%s)', (curp) => {
    expect(validator.isValid(curp)).toBe(true);
  });

  it.each([
    ['GODE561231HDFRRN01', 'a wrong check digit'],
    ['GODE561331HDFRRN09', 'month 13'],
    ['GODE000229HDFRRN08', 'February 29, 1900'],
    ['GODE561231HDFRRNK0', 'K in position 17, outside A to J'],
    ['GODE561231HZZRRN03', 'a state code outside the catalog'],
  ])('rejects %s (%s)', (curp) => {
    expect(validator.isValid(curp)).toBe(false);
  });

  it.each([
    ['', 'empty text'],
    ['gode561231hdfrrn00', 'lower case'],
    ['GODE561231HDFRRN0', '17 characters'],
    ['GODE561231QDFRRN00', 'Q where the sex goes'],
    ['GODE561231HDFRRN0 ', 'a trailing space'],
    [
      'GODE561231HDFRRN000',
      'an extra digit that the check over 18 characters accepts',
    ],
  ])('rejects %j (%s)', (candidate) => {
    expect(validator.isValid(candidate)).toBe(false);
  });
});
