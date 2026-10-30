import fc from 'fast-check';
import { describe, it } from 'vitest';
import bankCodes from '../../src/catalogs/bank-codes.json' with {
  type: 'json',
};
import cardNetworks from '../../src/catalogs/card-networks.json' with {
  type: 'json',
};
import identifiers from '../../src/catalogs/identifiers.json' with {
  type: 'json',
};
import stateCodes from '../../src/catalogs/state-codes.json' with {
  type: 'json',
};
import { clabeCheckDigit } from '../../src/validators/clabe-check-digit.js';
import { curpCheckDigit } from '../../src/validators/curp-check-digit.js';
import { luhnCheckDigit } from '../../src/validators/luhn.js';
import { rfcCheckDigit } from '../../src/validators/rfc-check-digit.js';
import { createDefaultValidatorRegistry } from '../../src/validators/validator-registry.js';

const DECIMAL_BASE = 10;
const CLABE_DIGITS_AFTER_BANK_CODE = 14;
const LONGEST_ARBITRARY_TEXT = 64;
const FIFTEEN_DIGIT_GROUPS = [4, 6, 5];
const SIXTEEN_DIGIT_GROUPS = [4, 4, 4, 4];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CURP_DIGIT_CHECKS = '0123456789';
const RFC_CHECK_CHARACTERS = '0123456789A';
const LAST_DAY_IN_EVERY_MONTH = 28;
const RFC_ALLOWLIST: ReadonlySet<string> = new Set(identifiers.rfc.allowlist);

const registry = createDefaultValidatorRegistry();
const clabeValidator = registry.validatorFor('clabe_checksum');
const cardValidator = registry.validatorFor('card_checksum');
const curpValidator = registry.validatorFor('curp_checksum');
const rfcValidator = registry.validatorFor('rfc_checksum');

function digits(length: number): fc.Arbitrary<string> {
  return fc.stringMatching(new RegExp(`^[0-9]{${length}}$`));
}

function characters(alphabet: string, length: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...alphabet), {
      minLength: length,
      maxLength: length,
    })
    .map((picked) => picked.join(''));
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

const possibleDate = fc
  .tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: LAST_DAY_IN_EVERY_MONTH }),
  )
  .map((parts) => parts.map(twoDigits).join(''));

function withLastCharacterReplaced(
  value: string,
  alphabet: string,
  index: number,
): string {
  const others = [...alphabet].filter(
    (character) => character !== value.slice(-1),
  );
  return `${value.slice(0, -1)}${others[index % others.length]}`;
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

const validCurp = fc
  .tuple(
    characters(LETTERS, 4),
    possibleDate,
    fc.constantFrom('H', 'M', 'X'),
    fc.constantFrom(...stateCodes),
    characters(LETTERS, 3),
    fc.constantFrom(...'0123456789ABCDEFGHIJ'),
  )
  .map((parts) => {
    const body = parts.join('');
    return `${body}${curpCheckDigit(body)}`;
  });

const validRfc = fc
  .tuple(
    fc.oneof(characters(LETTERS, 4), characters(`${LETTERS}&Ñ`, 3)),
    possibleDate,
    characters(`${LETTERS}0123456789`, 2),
  )
  .map((parts) => {
    const body = parts.join('');
    return `${body}${rfcCheckDigit(body)}`;
  })
  .filter((rfc) => !RFC_ALLOWLIST.has(rfc));

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
    ['curp_checksum', curpValidator],
    ['rfc_checksum', rfcValidator],
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

  it('accepts any CURP with a possible date, a catalog state and its check digit', () => {
    fc.assert(fc.property(validCurp, (curp) => curpValidator.isValid(curp)));
  });

  it('rejects any CURP whose check digit is replaced', () => {
    fc.assert(
      fc.property(
        validCurp,
        fc.nat(),
        (curp, index) =>
          !curpValidator.isValid(
            withLastCharacterReplaced(curp, CURP_DIGIT_CHECKS, index),
          ),
      ),
    );
  });

  it('accepts any RFC with a possible date and its check digit', () => {
    fc.assert(fc.property(validRfc, (rfc) => rfcValidator.isValid(rfc)));
  });

  it('rejects any RFC whose check character is replaced', () => {
    fc.assert(
      fc.property(
        validRfc,
        fc.nat(),
        (rfc, index) =>
          !rfcValidator.isValid(
            withLastCharacterReplaced(rfc, RFC_CHECK_CHARACTERS, index),
          ),
      ),
    );
  });
});
