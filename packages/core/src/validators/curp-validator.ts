import { isValidCompactDateInCentury } from './calendar.js';
import { curpCheckDigit } from './curp-check-digit.js';
import type { IdentifierValidator } from './identifier-validator.js';

const CURP_SHAPE = /^[A-Z]{4}[0-9]{6}[HMX][A-Z]{5}[A-Z0-9][0-9]$/;
const DATE_START = 4;
const DATE_END = 10;
const STATE_START = 11;
const STATE_END = 13;
const CENTURY_MARKER_POSITION = 16;
const BIRTHS_UP_TO_1999_MARKERS = '0123456789';
const BIRTHS_FROM_2000_MARKERS = 'ABCDEFGHIJ';
const TWENTIETH_CENTURY = 1900;
const TWENTY_FIRST_CENTURY = 2000;

const CENTURY_BY_MARKER: ReadonlyMap<string, number> = new Map([
  ...[...BIRTHS_UP_TO_1999_MARKERS].map(
    (marker) => [marker, TWENTIETH_CENTURY] as const,
  ),
  ...[...BIRTHS_FROM_2000_MARKERS].map(
    (marker) => [marker, TWENTY_FIRST_CENTURY] as const,
  ),
]);

function hasValidBirthDate(curp: string): boolean {
  const century = CENTURY_BY_MARKER.get(curp.charAt(CENTURY_MARKER_POSITION));
  return (
    century !== undefined &&
    isValidCompactDateInCentury(curp.slice(DATE_START, DATE_END), century)
  );
}

export function createCurpValidator(
  stateCodes: ReadonlySet<string>,
): IdentifierValidator {
  return {
    isValid: (candidate) =>
      CURP_SHAPE.test(candidate) &&
      curpCheckDigit(candidate.slice(0, -1)) === candidate.slice(-1) &&
      hasValidBirthDate(candidate) &&
      stateCodes.has(candidate.slice(STATE_START, STATE_END)),
  };
}
