import { describe, expect, it } from 'vitest';
import { curpRejection } from '../../tools/rules/curp.ts';

const KNOWN_STATE_CODES: ReadonlySet<string> = new Set(['DF', 'NE']);

describe('curpRejection', () => {
  it.each([
    ['GODE561231HDFRRN00', 'born in 1956, digit in position 17'],
    ['GODE561231MDFRRN00', 'sex M'],
    ['LOOA011231XNEPPRA6', 'born in 2001 abroad, sex X, letter in position 17'],
    ['GODE000229HDFRRNA8', 'February 29 of 2000'],
  ])('accepts %s (%s)', (curp) => {
    expect(curpRejection(curp, KNOWN_STATE_CODES)).toBe(undefined);
  });

  it('rejects a wrong check digit', () => {
    expect(curpRejection('GODE561231HDFRRN01', KNOWN_STATE_CODES)).toBe(
      'check_digit',
    );
  });

  it.each([
    ['GODE561331HDFRRN09', 'month 13'],
    ['GODE560001HDFRRN04', 'month 00'],
    ['GODE560230HDFRRN01', 'February 30'],
    [
      'GODE000229HDFRRN08',
      'February 29 of 1900, set by the digit in position 17',
    ],
    ['GODE561231HDFRRNK0', 'letter K in position 17, outside A to J'],
  ])('rejects %s for its date (%s)', (curp) => {
    expect(curpRejection(curp, KNOWN_STATE_CODES)).toBe('date');
  });

  it('rejects a state code outside the catalog', () => {
    expect(curpRejection('GODE561231HZZRRN03', KNOWN_STATE_CODES)).toBe(
      'state',
    );
  });
});
