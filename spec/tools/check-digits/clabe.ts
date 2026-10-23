const CLABE_CHECK_WEIGHTS = [
  3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7,
] as const;
const DECIMAL_BASE = 10;

export function clabeCheckDigit(firstSeventeenDigits: string): string {
  const weightedSum = CLABE_CHECK_WEIGHTS.reduce(
    (sum, weight, position) =>
      sum +
      ((Number(firstSeventeenDigits.charAt(position)) * weight) % DECIMAL_BASE),
    0,
  );
  return String((DECIMAL_BASE - (weightedSum % DECIMAL_BASE)) % DECIMAL_BASE);
}
