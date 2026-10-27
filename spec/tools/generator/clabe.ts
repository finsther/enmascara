import { clabeCheckDigit } from '../check-digits/clabe.ts';
import type { ReferenceCatalogs } from '../rules/index.ts';
import {
  type GeneratedValues,
  invalidValuesFrom,
  validValuesFrom,
} from './fixture-values.ts';
import type { Random } from './random.ts';

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
  catalogs: ReferenceCatalogs,
): GeneratedValues {
  const knownCodes = [...catalogs.bankCodes].sort();
  const validClabe = (): string =>
    withCheckDigit(`${random.pick(knownCodes)}${bodyAfterBankCode(random)}`);
  return {
    valid: validValuesFrom(validClabe),
    invalid: invalidValuesFrom([
      ['check_digit', () => withWrongCheckDigit(validClabe(), random)],
      [
        'bank_code',
        () =>
          withCheckDigit(
            `${unknownBankCode(random, catalogs.bankCodes)}${bodyAfterBankCode(random)}`,
          ),
      ],
    ]),
  };
}
