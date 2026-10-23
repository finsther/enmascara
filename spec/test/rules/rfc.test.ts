import { describe, expect, it } from 'vitest';
import { rfcRejection } from '../../tools/rules/rfc.js';

describe('rfcRejection', () => {
  it.each(['GODE561231GR8', 'COR391215F4A'])('accepts %s', (rfc) => {
    expect(rfcRejection(rfc)).toBe(undefined);
  });

  it('rejects a wrong check digit', () => {
    expect(rfcRejection('GODE561231GR9')).toBe('check_digit');
  });

  it.each([
    ['GODE561331GR2', 'month 13'],
    ['GODE560431GR3', 'April 31'],
    ['GODE560230GR8', 'February 30'],
    ['GODE010229GR7', 'February 29 of a year that is never leap'],
    ['COR391315F44', 'month 13 in a persona moral'],
    ['COR390229F47', 'February 29 of 1939 in a persona moral'],
  ])('rejects %s for its date, %s', (rfc) => {
    expect(rfcRejection(rfc)).toBe('date');
  });

  it.each([
    ['GODE000229GR4', 'year 00, leap as 2000'],
    ['COR400229F44', 'year 40, leap as 1940'],
  ])('accepts February 29 in %s, %s', (rfc) => {
    expect(rfcRejection(rfc)).toBe(undefined);
  });
});
