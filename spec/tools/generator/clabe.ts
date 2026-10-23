import { clabeCheckDigit } from '../check-digits/clabe.js';
import {
  FIXTURES_PER_REJECTION,
  type GeneratedValues,
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from './fixture-values.js';
import type { Random } from './random.js';
import { uniqueValues } from './unique.js';

const DIGITS = '0123456789';
const BANK_CODE_LENGTH = 3;
const DIGITS_AFTER_BANK_CODE = 14;
const DECIMAL_BASE = 10;

function withCheckDigit(body: string): string {
  return `${body}${clabeCheckDigit(body)}`;
}

function bodyAfterBankCode(random: Random): string {
  return random.characters(DIGITS, DIGITS_AFTER_BANK_CODE);
}

function unknownBankCode(
  random: Random,
  bankCodes: ReadonlySet<string>,
): string {
  const candidate = random.characters(DIGITS, BANK_CODE_LENGTH);
  return bankCodes.has(candidate)
    ? unknownBankCode(random, bankCodes)
    : candidate;
}

function withWrongCheckDigit(clabe: string, random: Random): string {
  const wrongDigit =
    (Number(clabe.slice(-1)) + random.integer(1, 9)) % DECIMAL_BASE;
  return `${clabe.slice(0, -1)}${wrongDigit}`;
}

export function generateClabeValues(
  random: Random,
  bankCodes: ReadonlySet<string>,
): GeneratedValues {
  const knownCodes = [...bankCodes].sort();
  const validClabe = (): string =>
    withCheckDigit(`${random.pick(knownCodes)}${bodyAfterBankCode(random)}`);
  const byValue = (fixture: InvalidValue): string => fixture.value;
  return {
    valid: uniqueValues(MINIMUM_FIXTURES_PER_GROUP, validClabe, String),
    invalid: [
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: withWrongCheckDigit(validClabe(), random),
          reason: 'check_digit' as const,
        }),
        byValue,
      ),
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: withCheckDigit(
            `${unknownBankCode(random, bankCodes)}${bodyAfterBankCode(random)}`,
          ),
          reason: 'bank_code' as const,
        }),
        byValue,
      ),
    ],
  };
}
