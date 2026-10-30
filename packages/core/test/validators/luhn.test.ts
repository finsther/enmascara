import { describe, expect, it } from 'vitest';
import { luhnCheckDigit } from '../../src/validators/luhn.js';

const STRIPE_TEST_CARD_NUMBERS = [
  '4242424242424242',
  '5555555555554444',
  '2223003122003222',
  '378282246310005',
  '371449635398431',
];
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

describe('luhnCheckDigit', () => {
  it.each(STRIPE_TEST_CARD_NUMBERS)(
    'reproduces the check digit of the Stripe test card %s',
    (cardNumber) => {
      expect(luhnCheckDigit(cardNumber.slice(0, -1))).toBe(
        cardNumber.slice(-1),
      );
    },
  );

  it.each(['4242424242424242', '378282246310005'])(
    'changes when any single digit of the body of %s changes',
    (cardNumber) => {
      const body = cardNumber.slice(0, -1);
      const checkDigit = cardNumber.slice(-1);

      const undetected = singleDigitChanges(body).filter(
        (altered) => luhnCheckDigit(altered) === checkDigit,
      );

      expect(undetected).toEqual([]);
    },
  );
});
