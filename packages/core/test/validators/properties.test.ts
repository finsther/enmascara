import fc from 'fast-check';
import { describe, it } from 'vitest';
import bankCodes from '../../src/catalogs/bank-codes.json' with {
  type: 'json',
};
import cardNetworks from '../../src/catalogs/card-networks.json' with {
  type: 'json',
};
import { clabeCheckDigit } from '../../src/validators/clabe-check-digit.js';
import { luhnCheckDigit } from '../../src/validators/luhn.js';
import { createDefaultValidatorRegistry } from '../../src/validators/validator-registry.js';

const DECIMAL_BASE = 10;
const CLABE_DIGITS_AFTER_BANK_CODE = 14;
const LONGEST_ARBITRARY_TEXT = 64;
const FIFTEEN_DIGIT_GROUPS = [4, 6, 5];
const SIXTEEN_DIGIT_GROUPS = [4, 4, 4, 4];

const registry = createDefaultValidatorRegistry();
const clabeValidator = registry.validatorFor('clabe_checksum');
const cardValidator = registry.validatorFor('card_checksum');

function digits(length: number): fc.Arbitrary<string> {
  return fc.stringMatching(new RegExp(`^[0-9]{${length}}$`));
}

function withDigitShifted(
  value: string,
  position: number,
  shift: number,
): string {
  const shifted = (Number(value.charAt(position)) + shift) % DECIMAL_BASE;
  return `${value.slice(0, position)}${shifted}${value.slice(position + 1)}`;
}

function grouped(cardNumber: string, separator: string): string {
  const groups =
    cardNumber.length === 15 ? FIFTEEN_DIGIT_GROUPS : SIXTEEN_DIGIT_GROUPS;
  return groups
    .map((size, index) => {
      const start = groups
        .slice(0, index)
        .reduce((sum, group) => sum + group, 0);
      return cardNumber.slice(start, start + size);
    })
    .join(separator);
}

const validClabe = fc
  .tuple(fc.constantFrom(...bankCodes), digits(CLABE_DIGITS_AFTER_BANK_CODE))
  .map(([bankCode, rest]) => {
    const body = `${bankCode}${rest}`;
    return `${body}${clabeCheckDigit(body)}`;
  });

const validCardNumber = fc
  .constantFrom(...cardNetworks)
  .chain((network) =>
    fc.tuple(
      fc.constantFrom(...network.prefixes),
      fc.constantFrom(...network.lengths),
    ),
  )
  .chain(([range, length]) =>
    fc
      .integer({ min: Number(range.from), max: Number(range.to) })
      .map((prefix) => String(prefix).padStart(range.from.length, '0'))
      .chain((prefix) =>
        digits(length - prefix.length - 1).map((rest) => {
          const body = `${prefix}${rest}`;
          return `${body}${luhnCheckDigit(body)}`;
        }),
      ),
  );

describe('validator properties', () => {
  it.each([
    ['clabe_checksum', clabeValidator],
    ['card_checksum', cardValidator],
  ])('%s answers any text without throwing', (_name, validator) => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary', maxLength: LONGEST_ARBITRARY_TEXT }),
        (text) => typeof validator.isValid(text) === 'boolean',
      ),
    );
  });

  it('accepts any CLABE built from a catalog bank and its check digit', () => {
    fc.assert(
      fc.property(validClabe, (clabe) => clabeValidator.isValid(clabe)),
    );
  });

  it('rejects any CLABE with a single digit changed', () => {
    fc.assert(
      fc.property(
        validClabe,
        fc.integer({ min: 0, max: 17 }),
        fc.integer({ min: 1, max: 9 }),
        (clabe, position, shift) =>
          !clabeValidator.isValid(withDigitShifted(clabe, position, shift)),
      ),
    );
  });

  it('accepts any card number of a catalog network, grouped or not', () => {
    fc.assert(
      fc.property(
        validCardNumber,
        fc.constantFrom('', ' ', '-'),
        (cardNumber, separator) =>
          cardValidator.isValid(grouped(cardNumber, separator)),
      ),
    );
  });

  it('rejects any card number with a single digit changed', () => {
    fc.assert(
      fc.property(
        validCardNumber,
        fc.nat(),
        fc.integer({ min: 1, max: 9 }),
        (cardNumber, anyPosition, shift) => {
          const position = anyPosition % cardNumber.length;
          return !cardValidator.isValid(
            withDigitShifted(cardNumber, position, shift),
          );
        },
      ),
    );
  });
});
