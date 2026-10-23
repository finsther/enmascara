import { curpCheckDigit } from '../check-digits/curp.ts';
import type { ReferenceCatalogs } from '../rules/index.ts';
import {
  type GeneratedValues,
  invalidValuesFrom,
  validValuesFrom,
} from './fixture-values.ts';
import type { Random } from './random.ts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const BIRTHS_UP_TO_1999_MARKERS = '0123456789';
const BIRTHS_FROM_2000_MARKERS = 'ABCDEFGHIJ';
const SEXES = ['H', 'M', 'X'] as const;
const NAME_LETTER_COUNT = 4;
const INNER_CONSONANT_COUNT = 3;
const STATE_CODE_LENGTH = 2;
const LAST_TWO_DIGIT_YEAR = 99;
const LAST_MONTH = 12;
const LAST_DAY_IN_EVERY_MONTH = 28;
const FIRST_IMPOSSIBLE_MONTH = 13;
const LAST_IMPOSSIBLE_MONTH = 19;

interface CurpParts {
  readonly month: number;
  readonly stateCode: string;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function curpWith(random: Random, parts: CurpParts): string {
  const centuryMarkers = random.pick([
    BIRTHS_UP_TO_1999_MARKERS,
    BIRTHS_FROM_2000_MARKERS,
  ]);
  const body = [
    random.characters(LETTERS, NAME_LETTER_COUNT),
    twoDigits(random.integer(0, LAST_TWO_DIGIT_YEAR)),
    twoDigits(parts.month),
    twoDigits(random.integer(1, LAST_DAY_IN_EVERY_MONTH)),
    random.pick(SEXES),
    parts.stateCode,
    random.characters(CONSONANTS, INNER_CONSONANT_COUNT),
    random.pick([...centuryMarkers]),
  ].join('');
  return `${body}${curpCheckDigit(body)}`;
}

function unknownStateCode(
  random: Random,
  stateCodes: ReadonlySet<string>,
): string {
  const candidate = random.characters(LETTERS, STATE_CODE_LENGTH);
  return stateCodes.has(candidate)
    ? unknownStateCode(random, stateCodes)
    : candidate;
}

function withWrongCheckDigit(curp: string, random: Random): string {
  const otherDigits = BIRTHS_UP_TO_1999_MARKERS.replace(curp.slice(-1), '');
  return `${curp.slice(0, -1)}${random.pick([...otherDigits])}`;
}

export function generateCurpValues(
  random: Random,
  catalogs: ReferenceCatalogs,
): GeneratedValues {
  const knownStateCodes = [...catalogs.stateCodes].sort();
  const validCurp = (): string =>
    curpWith(random, {
      month: random.integer(1, LAST_MONTH),
      stateCode: random.pick(knownStateCodes),
    });
  return {
    valid: validValuesFrom(validCurp),
    invalid: invalidValuesFrom([
      ['check_digit', () => withWrongCheckDigit(validCurp(), random)],
      [
        'date',
        () =>
          curpWith(random, {
            month: random.integer(
              FIRST_IMPOSSIBLE_MONTH,
              LAST_IMPOSSIBLE_MONTH,
            ),
            stateCode: random.pick(knownStateCodes),
          }),
      ],
      [
        'state',
        () =>
          curpWith(random, {
            month: random.integer(1, LAST_MONTH),
            stateCode: unknownStateCode(random, catalogs.stateCodes),
          }),
      ],
    ]),
  };
}
