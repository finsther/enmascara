import { describe, expect, it } from 'vitest';
import {
  type CardNetwork,
  createCardValidator,
} from '../../src/validators/card-validator.js';

const NETWORKS: readonly CardNetwork[] = [
  { name: 'Visa', lengths: [16], prefixes: [{ from: '4', to: '4' }] },
  {
    name: 'Mastercard',
    lengths: [16],
    prefixes: [{ from: '22210000', to: '27209999' }],
  },
  {
    name: 'American Express',
    lengths: [15],
    prefixes: [
      { from: '34', to: '34' },
      { from: '37', to: '37' },
    ],
  },
];

describe('createCardValidator', () => {
  const validator = createCardValidator(NETWORKS);

  it.each([
    ['4242424242424242', 'Visa'],
    ['4242 4242 4242 4242', 'Visa with spaces'],
    ['4242-4242-4242-4242', 'Visa with dashes'],
    ['2221000000000009', 'the first number of an 8-digit range'],
    ['2720999999999996', 'the last number of an 8-digit range'],
    ['378282246310005', 'American Express'],
    ['3782 822463 10005', 'American Express in 4-6-5 groups'],
  ])('accepts %s (%s)', (cardNumber) => {
    expect(validator.isValid(cardNumber)).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(validator.isValid('4242424242424241')).toBe(false);
  });

  it.each([
    ['5555555555554444', 'a network that is not listed'],
    ['2220999999999991', 'just below an 8-digit range'],
    ['2721000000000004', 'just above an 8-digit range'],
    ['3400000000000000', 'an American Express prefix with 16 digits'],
    ['400000000000006', 'a Visa prefix with 15 digits'],
  ])('rejects %s (%s)', (cardNumber) => {
    expect(validator.isValid(cardNumber)).toBe(false);
  });

  it.each([
    ['', 'empty text'],
    ['abcd efgh ijkl mnop', 'letters'],
    ['４２４２424242424242', 'full-width digits'],
    ['4242.4242.4242.4242', 'dots as separators'],
  ])('rejects %j (%s)', (candidate) => {
    expect(validator.isValid(candidate)).toBe(false);
  });
});
