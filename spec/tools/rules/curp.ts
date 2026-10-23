import { curpCheckDigit } from '../check-digits/curp.ts';
import { isValidCompactDateInCentury } from './calendar.ts';
import type { Rejection } from './rejection.ts';

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

export function curpRejection(
  curp: string,
  stateCodes: ReadonlySet<string>,
): Rejection | undefined {
  if (curpCheckDigit(curp.slice(0, -1)) !== curp.slice(-1)) {
    return 'check_digit';
  }
  if (!hasValidBirthDate(curp)) {
    return 'date';
  }
  if (!stateCodes.has(curp.slice(STATE_START, STATE_END))) {
    return 'state';
  }
  return undefined;
}
