import { describe, expect, it } from 'vitest';
import { curpCheckDigit } from '../../tools/check-digits/curp.ts';

const VALUES_FROM_A_SEPARATE_IMPLEMENTATION = [
  'GODE561231HDFRRN00',
  'PEAM800101MJCRLR11',
  'LOOA011231XNEPPRA6',
  'ZAZZ991231HZSZZZ98',
  'AAAA000101MASAAAA0',
];
const ILLUSTRATIVE_DOF_2018_EXAMPLE = 'SABC560626MDFLRN09';
const CHECK_DIGIT_UNDER_THE_COMMON_ALGORITHM = '1';

describe('curpCheckDigit', () => {
  it.each(VALUES_FROM_A_SEPARATE_IMPLEMENTATION)(
    'agrees with a separate implementation of the unofficial algorithm on %s',
    (curp) => {
      expect(curpCheckDigit(curp.slice(0, -1))).toBe(curp.slice(-1));
    },
  );

  it('does not reproduce the illustrative example of the DOF 2018 Instructivo', () => {
    expect(curpCheckDigit(ILLUSTRATIVE_DOF_2018_EXAMPLE.slice(0, -1))).toBe(
      CHECK_DIGIT_UNDER_THE_COMMON_ALGORITHM,
    );
  });
});
