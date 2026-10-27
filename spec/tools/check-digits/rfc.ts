const RFC_CHARACTER_VALUES = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
const RFC_BODY_LENGTH = 12;
const PADDING_CHARACTER = ' ';
const HIGHEST_WEIGHT = RFC_BODY_LENGTH + 1;
const RFC_MODULUS = 11;
const CHECK_VALUE_WRITTEN_AS_LETTER = 10;
const LETTER_FOR_CHECK_VALUE_TEN = 'A';

function characterValue(character: string): number {
  return RFC_CHARACTER_VALUES.indexOf(character);
}

function checkValue(remainder: number): number {
  return remainder === 0 ? 0 : RFC_MODULUS - remainder;
}

export function rfcCheckDigit(bodyWithoutCheckDigit: string): string {
  const paddedBody = bodyWithoutCheckDigit.padStart(
    RFC_BODY_LENGTH,
    PADDING_CHARACTER,
  );
  const weightedSum = [...paddedBody].reduce(
    (sum, character, position) =>
      sum + characterValue(character) * (HIGHEST_WEIGHT - position),
    0,
  );
  const value = checkValue(weightedSum % RFC_MODULUS);
  return value === CHECK_VALUE_WRITTEN_AS_LETTER
    ? LETTER_FOR_CHECK_VALUE_TEN
    : String(value);
}
