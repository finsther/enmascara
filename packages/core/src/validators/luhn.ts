const DECIMAL_BASE = 10;

function sumOfDigits(value: number): number {
  return Math.floor(value / DECIMAL_BASE) + (value % DECIMAL_BASE);
}

export function luhnCheckDigit(digitsWithoutCheckDigit: string): string {
  const sum = [...digitsWithoutCheckDigit]
    .reverse()
    .reduce((total, character, offsetFromRight) => {
      const digit = Number(character);
      return (
        total + (offsetFromRight % 2 === 0 ? sumOfDigits(digit * 2) : digit)
      );
    }, 0);
  return String((DECIMAL_BASE - (sum % DECIMAL_BASE)) % DECIMAL_BASE);
}
