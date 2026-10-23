import { rfcCheckDigit } from '../check-digits/rfc.js';
import { isValidCompactDateInAnyCentury } from './calendar.js';
import type { Rejection } from './rejection.js';

const DATE_START_FROM_END = -9;
const DATE_END_FROM_END = -3;

export function rfcRejection(rfc: string): Rejection | undefined {
  if (rfcCheckDigit(rfc.slice(0, -1)) !== rfc.slice(-1)) {
    return 'check_digit';
  }
  if (
    !isValidCompactDateInAnyCentury(
      rfc.slice(DATE_START_FROM_END, DATE_END_FROM_END),
    )
  ) {
    return 'date';
  }
  return undefined;
}
