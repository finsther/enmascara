const DECIMAL_DIGITS = '0123456789';

type CheckDigitFunction = (body: string) => string;

function withDigitReplaced(
  digits: string,
  position: number,
  replacement: string,
): string {
  return `${digits.slice(0, position)}${replacement}${digits.slice(position + 1)}`;
}

export function singleDigitChangesKeepingCheckDigit(
  body: string,
  computeCheckDigit: CheckDigitFunction,
): readonly string[] {
  const checkDigit = computeCheckDigit(body);
  return [...body].flatMap((original, position) =>
    [...DECIMAL_DIGITS]
      .filter((replacement) => replacement !== original)
      .map((replacement) => withDigitReplaced(body, position, replacement))
      .filter((altered) => computeCheckDigit(altered) === checkDigit),
  );
}
