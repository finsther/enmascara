import { clabeCheckDigit } from '../check-digits/clabe.js';
import type { Rejection } from './rejection.js';

const BANK_CODE_LENGTH = 3;

export function clabeRejection(
  clabe: string,
  bankCodes: ReadonlySet<string>,
): Rejection | undefined {
  if (clabeCheckDigit(clabe.slice(0, -1)) !== clabe.slice(-1)) {
    return 'check_digit';
  }
  if (!bankCodes.has(clabe.slice(0, BANK_CODE_LENGTH))) {
    return 'bank_code';
  }
  return undefined;
}
