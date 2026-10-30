import { describe, expect, it } from 'vitest';
import {
  isPossibleCompactDate,
  isValidCompactDateInCentury,
} from '../../src/validators/calendar.js';

describe('isValidCompactDateInCentury', () => {
  it.each([
    ['561231', 1900, 'December 31, 1956'],
    ['560101', 1900, 'January 1, 1956'],
    ['000229', 2000, 'February 29, 2000'],
    ['040229', 1900, 'February 29, 1904'],
  ])('accepts %s in %i (%s)', (yearMonthDay, century) => {
    expect(isValidCompactDateInCentury(yearMonthDay, century)).toBe(true);
  });

  it.each([
    ['000229', 1900, 'February 29, 1900, not a leap year'],
    ['560230', 1900, 'February 30'],
    ['560431', 1900, 'April 31'],
    ['561301', 1900, 'month 13'],
    ['560001', 1900, 'month 00'],
    ['561200', 1900, 'day 00'],
    ['561232', 1900, 'day 32'],
  ])('rejects %s in %i (%s)', (yearMonthDay, century) => {
    expect(isValidCompactDateInCentury(yearMonthDay, century)).toBe(false);
  });
});

describe('isPossibleCompactDate', () => {
  it('accepts February 29 of year 00, which exists as 2000', () => {
    expect(isPossibleCompactDate('000229')).toBe(true);
  });

  it('accepts an ordinary date', () => {
    expect(isPossibleCompactDate('561231')).toBe(true);
  });

  it('rejects February 29 of a year that is never leap', () => {
    expect(isPossibleCompactDate('010229')).toBe(false);
  });
});
