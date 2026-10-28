import { describe, expect, it } from 'vitest';
import { clabeCheckDigit } from '../../src/validators/clabe-check-digit.js';

const BANXICO_CIRCULAR_12_2018_EXAMPLE = '002180032240946700';
const DECIMAL_DIGITS = '0123456789';

function singleDigitChanges(digits: string): readonly string[] {
  return [...digits].flatMap((original, position) =>
    [...DECIMAL_DIGITS]
      .filter((replacement) => replacement !== original)
      .map(
        (replacement) =>
          `${digits.slice(0, position)}${replacement}${digits.slice(position + 1)}`,
      ),
  );
}

describe('clabeCheckDigit', () => {
  const body = BANXICO_CIRCULAR_12_2018_EXAMPLE.slice(0, -1);
  const checkDigit = BANXICO_CIRCULAR_12_2018_EXAMPLE.slice(-1);

  it('reproduces the worked example of Banxico Circular 12/2018, Annex 4', () => {
    expect(clabeCheckDigit(body)).toBe(checkDigit);
  });

  it('changes when any single digit of the body changes', () => {
    const undetected = singleDigitChanges(body).filter(
      (altered) => clabeCheckDigit(altered) === checkDigit,
    );

    expect(undetected).toEqual([]);
  });
});
