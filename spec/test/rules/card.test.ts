import { describe, expect, it } from 'vitest';
import { cardRejection } from '../../tools/rules/card.ts';
import { readCatalogs } from '../support/fixture-problems.ts';

const { cardNetworks } = readCatalogs();

describe('cardRejection', () => {
  it.each([
    ['4242424242424242', 'Visa'],
    ['4242 4242 4242 4242', 'Visa with spaces'],
    ['4242-4242-4242-4242', 'Visa with dashes'],
    ['5555555555554444', 'Mastercard 51-55'],
    ['2221000000000009', 'Mastercard 2-series lower bound'],
    ['2720999999999996', 'Mastercard 2-series upper bound'],
    ['378282246310005', 'American Express'],
    ['3782 822463 10005', 'American Express in 4-6-5 groups'],
    ['6011111111111117', 'Discover'],
    ['3056930009020004', 'Diners Club International'],
    ['3566002020360505', 'JCB'],
    ['6200000000000005', 'UnionPay'],
  ])('accepts %s (%s)', (cardNumber) => {
    expect(cardRejection(cardNumber, cardNetworks)).toBe(undefined);
  });

  it('rejects a wrong check digit', () => {
    expect(cardRejection('4242424242424241', cardNetworks)).toBe('check_digit');
  });

  it.each([
    ['9000000000000001', 'national use prefix'],
    ['2220999999999991', 'just below the Mastercard 2-series'],
    ['2721000000000004', 'just above the Mastercard 2-series'],
    ['5600000000000003', 'just above Mastercard 51-55'],
    ['5000000000000009', 'just below Mastercard 51-55'],
    ['3400000000000000', 'American Express prefix with 16 digits'],
    ['400000000000006', 'Visa prefix with 15 digits'],
  ])('rejects %s for its network prefix, %s', (cardNumber) => {
    expect(cardRejection(cardNumber, cardNetworks)).toBe('network_prefix');
  });
});
