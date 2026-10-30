import { describe, expect, it } from 'vitest';
import { rfcCheckDigit } from '../../src/validators/rfc-check-digit.js';

const SAT_ALGORITHM_EXAMPLE = 'GODE561231GR8';
const ANEXO_20_EXAMPLES = ['COR391215F4A', 'PAL7202161U0', 'XEXX010101000'];

describe('rfcCheckDigit', () => {
  it.each([SAT_ALGORITHM_EXAMPLE, ...ANEXO_20_EXAMPLES])(
    'reproduces the check digit of the SAT example %s',
    (rfc) => {
      expect(rfcCheckDigit(rfc.slice(0, -1))).toBe(rfc.slice(-1));
    },
  );

  it('does not validate the generic RFC for the general public', () => {
    expect(rfcCheckDigit('XAXX010101000'.slice(0, -1))).not.toBe('0');
  });
});
