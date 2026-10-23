const CURP_CHARACTER_VALUES = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
const CURP_BODY_LENGTH = 17;
const HIGHEST_WEIGHT = CURP_BODY_LENGTH + 1;
const DECIMAL_BASE = 10;

export function curpCheckDigit(firstSeventeenCharacters: string): string {
  const weightedSum = [...firstSeventeenCharacters].reduce(
    (sum, character, position) =>
      sum +
      CURP_CHARACTER_VALUES.indexOf(character) * (HIGHEST_WEIGHT - position),
    0,
  );
  return String((DECIMAL_BASE - (weightedSum % DECIMAL_BASE)) % DECIMAL_BASE);
}
