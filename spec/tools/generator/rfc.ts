import { rfcCheckDigit } from '../check-digits/rfc.js';
import {
  FIXTURES_PER_REJECTION,
  type GeneratedValues,
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from './fixture-values.js';
import type { Random } from './random.js';
import { uniqueValues } from './unique.js';

const PERSONA_FISICA_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PERSONA_MORAL_LETTERS = `${PERSONA_FISICA_LETTERS}&Ñ`;
const HOMOCLAVE_CHARACTERS = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
const CHECK_DIGIT_CHARACTERS = '0123456789A';
const PERSONA_FISICA_LETTER_COUNT = 4;
const PERSONA_MORAL_LETTER_COUNT = 3;
const HOMOCLAVE_LENGTH = 2;
const LAST_TWO_DIGIT_YEAR = 99;
const LAST_MONTH = 12;
const LAST_DAY_IN_EVERY_MONTH = 28;
const FIRST_IMPOSSIBLE_MONTH = 13;
const LAST_IMPOSSIBLE_MONTH = 19;

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function possibleDate(random: Random): string {
  return [
    random.integer(0, LAST_TWO_DIGIT_YEAR),
    random.integer(1, LAST_MONTH),
    random.integer(1, LAST_DAY_IN_EVERY_MONTH),
  ]
    .map(twoDigits)
    .join('');
}

function impossibleDate(random: Random): string {
  return [
    random.integer(0, LAST_TWO_DIGIT_YEAR),
    random.integer(FIRST_IMPOSSIBLE_MONTH, LAST_IMPOSSIBLE_MONTH),
    random.integer(1, LAST_DAY_IN_EVERY_MONTH),
  ]
    .map(twoDigits)
    .join('');
}

function letters(random: Random): string {
  return random.pick([
    random.characters(PERSONA_FISICA_LETTERS, PERSONA_FISICA_LETTER_COUNT),
    random.characters(PERSONA_MORAL_LETTERS, PERSONA_MORAL_LETTER_COUNT),
  ]);
}

function rfcWithDate(random: Random, date: string): string {
  const body = `${letters(random)}${date}${random.characters(HOMOCLAVE_CHARACTERS, HOMOCLAVE_LENGTH)}`;
  return `${body}${rfcCheckDigit(body)}`;
}

function withWrongCheckDigit(rfc: string, random: Random): string {
  const otherCharacters = CHECK_DIGIT_CHARACTERS.replace(rfc.slice(-1), '');
  return `${rfc.slice(0, -1)}${random.pick([...otherCharacters])}`;
}

export function generateRfcValues(random: Random): GeneratedValues {
  const validRfc = (): string => rfcWithDate(random, possibleDate(random));
  const byValue = (fixture: InvalidValue): string => fixture.value;
  return {
    valid: uniqueValues(MINIMUM_FIXTURES_PER_GROUP, validRfc, String),
    invalid: [
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: withWrongCheckDigit(validRfc(), random),
          reason: 'check_digit' as const,
        }),
        byValue,
      ),
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: rfcWithDate(random, impossibleDate(random)),
          reason: 'date' as const,
        }),
        byValue,
      ),
    ],
  };
}
