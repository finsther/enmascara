import { describe, expect, it } from 'vitest';
import { createRfcValidator } from '../../src/validators/rfc-validator.js';

describe('createRfcValidator', () => {
  const validator = createRfcValidator();

  it.each([
    ['GODE561231GR8', 'persona física from the SAT algorithm'],
    ['COR391215F4A', 'persona moral from Anexo 20'],
    ['GODE000229GR4', 'February 29 of year 00, which exists as 2000'],
    [
      'XEXX010101000',
      'the generic RFC for foreign residents, before any allowlist',
    ],
  ])('accepts %s (%s)', (rfc) => {
    expect(validator.isValid(rfc)).toBe(true);
  });

  it.each([
    ['GODE561231GR9', 'a wrong check digit'],
    ['GODE561331GR2', 'month 13'],
    ['GODE010229GR7', 'February 29 of a year that is never leap'],
    ['COR390229F47', 'February 29 of 1939 in a persona moral'],
  ])('rejects %s (%s)', (rfc) => {
    expect(validator.isValid(rfc)).toBe(false);
  });

  it.each([
    ['', 'empty text'],
    ['gode561231gr8', 'lower case'],
    ['GO561231GR8', 'two letters'],
    ['GODE561231GRB', 'B as the check character'],
    [' GODE561231GR8', 'a leading space'],
    ['AGODE561231GR8', 'an extra leading letter that keeps the check valid'],
    [
      'GODE0110111B70',
      'an extra character that keeps the check and a shifted date valid',
    ],
  ])('rejects %j (%s)', (candidate) => {
    expect(validator.isValid(candidate)).toBe(false);
  });
});
