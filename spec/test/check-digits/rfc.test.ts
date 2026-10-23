import { describe, expect, it } from 'vitest';
import { rfcCheckDigit } from '../../tools/check-digits/rfc.ts';

const SAT_ALGORITHM_EXAMPLE = 'GODE561231GR8';
const ANEXO_20_EXAMPLES = ['COR391215F4A', 'PAL7202161U0', 'XEXX010101000'];
const GENERIC_RFC_FOR_GENERAL_PUBLIC = 'XAXX010101000';

function bodyOf(rfc: string): string {
  return rfc.slice(0, -1);
}

function checkDigitOf(rfc: string): string {
  return rfc.slice(-1);
}

describe('rfcCheckDigit', () => {
  it('reproduces the worked example of the SAT homoclave algorithm', () => {
    expect(rfcCheckDigit(bodyOf(SAT_ALGORITHM_EXAMPLE))).toBe(
      checkDigitOf(SAT_ALGORITHM_EXAMPLE),
    );
  });

  it.each(ANEXO_20_EXAMPLES)(
    'reproduces the check digit of %s from SAT Anexo 20',
    (rfc) => {
      expect(rfcCheckDigit(bodyOf(rfc))).toBe(checkDigitOf(rfc));
    },
  );

  it('maps a check value of 10 to the letter A', () => {
    expect(rfcCheckDigit(bodyOf('COR391215F4A'))).toBe('A');
  });

  it('does not validate the generic RFC for the general public', () => {
    expect(rfcCheckDigit(bodyOf(GENERIC_RFC_FOR_GENERAL_PUBLIC))).not.toBe(
      checkDigitOf(GENERIC_RFC_FOR_GENERAL_PUBLIC),
    );
  });
});
