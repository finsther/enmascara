import { describe, expect, it } from 'vitest';
import { clabeCheckDigit } from '../../tools/check-digits/clabe.js';
import { singleDigitChangesKeepingCheckDigit } from '../support/single-digit-changes.js';

const BANXICO_CIRCULAR_12_2018_EXAMPLE = '002180032240946700';

describe('clabeCheckDigit', () => {
  const body = BANXICO_CIRCULAR_12_2018_EXAMPLE.slice(0, -1);

  it('reproduces the worked example of Banxico Circular 12/2018, Annex 4', () => {
    expect(clabeCheckDigit(body)).toBe(
      BANXICO_CIRCULAR_12_2018_EXAMPLE.slice(-1),
    );
  });

  it('changes when any single digit of the body changes', () => {
    expect(singleDigitChangesKeepingCheckDigit(body, clabeCheckDigit)).toEqual(
      [],
    );
  });
});
