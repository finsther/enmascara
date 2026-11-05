import { describe, expect, it } from 'vitest';
import { canonicalValue } from '../../src/strategies/canonical-value.js';

describe('canonicalValue', () => {
  it.each([
    ['GODE561231HDFRRN00', 'GODE561231HDFRRN00', 'a plain CURP'],
    [
      'gode561231​hdfrrn00',
      'GODE561231HDFRRN00',
      'lower case with a zero-width space',
    ],
    ['002-180-03224094670-0', '002180032240946700', 'a CLABE with dashes'],
    ['4242 4242 4242 4242', '4242424242424242', 'a card with spaces'],
    ['００２１８０', '002180', 'full-width digits'],
    ['ÑA&B', 'ÑA&B', 'the Ñ and & that RFC allows'],
  ])('turns %j into %j (%s)', (value, canonical) => {
    expect(canonicalValue(value)).toBe(canonical);
  });
});
