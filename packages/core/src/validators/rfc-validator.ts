import { isPossibleCompactDate } from './calendar.js';
import type { IdentifierValidator } from './identifier-validator.js';
import { rfcCheckDigit } from './rfc-check-digit.js';

const RFC_SHAPE = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{2}[0-9A]$/u;
const DATE_START_FROM_END = -9;
const DATE_END_FROM_END = -3;

export function createRfcValidator(): IdentifierValidator {
  return {
    isValid: (candidate) =>
      RFC_SHAPE.test(candidate) &&
      rfcCheckDigit(candidate.slice(0, -1)) === candidate.slice(-1) &&
      isPossibleCompactDate(
        candidate.slice(DATE_START_FROM_END, DATE_END_FROM_END),
      ),
  };
}
