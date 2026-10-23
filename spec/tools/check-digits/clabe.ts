const CLABE_CHECK_WEIGHTS = [3, 7, 1] as const;
const DECIMAL_BASE = 10;

function weightAt(position: number): number {
  return CLABE_CHECK_WEIGHTS[position % CLABE_CHECK_WEIGHTS.length] ?? 0;
}

export function clabeCheckDigit(firstSeventeenDigits: string): string {
  const weightedSum = [...firstSeventeenDigits].reduce(
    (sum, digit, position) =>
      sum + ((Number(digit) * weightAt(position)) % DECIMAL_BASE),
    0,
  );
  return String((DECIMAL_BASE - (weightedSum % DECIMAL_BASE)) % DECIMAL_BASE);
}
