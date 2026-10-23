const DECIMAL_BASE = 10;
const DOUBLED_DIGIT_REDUCTION = 9;

function doubled(digit: number): number {
  const product = digit * 2;
  return product > DOUBLED_DIGIT_REDUCTION
    ? product - DOUBLED_DIGIT_REDUCTION
    : product;
}

export function luhnCheckDigit(digitsWithoutCheckDigit: string): string {
  const sum = [...digitsWithoutCheckDigit]
    .reverse()
    .reduce((total, character, offsetFromRight) => {
      const digit = Number(character);
      return total + (offsetFromRight % 2 === 0 ? doubled(digit) : digit);
    }, 0);
  return String((DECIMAL_BASE - (sum % DECIMAL_BASE)) % DECIMAL_BASE);
}
