import { describe, expect, it } from 'vitest';
import { curpCheckDigit } from '../../src/validators/curp-check-digit.js';

const VALUES_FROM_A_SEPARATE_IMPLEMENTATION = [
  'GODE561231HDFRRN00',
  'PEAM800101MJCRLR11',
  'LOOA011231XNEPPRA6',
  'ZAZZ991231HZSZZZ98',
  'AAAA000101MASAAAA0',
];

describe('curpCheckDigit', () => {
  it.each(VALUES_FROM_A_SEPARATE_IMPLEMENTATION)(
    'agrees with a separate implementation of the unofficial algorithm on %s',
    (curp) => {
      expect(curpCheckDigit(curp.slice(0, -1))).toBe(curp.slice(-1));
    },
  );
});
