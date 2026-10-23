const FIRST_MONTH = 1;
const LAST_MONTH = 12;
const FIRST_DAY = 1;
const TWO_DIGIT_YEAR_CENTURIES = [1900, 2000] as const;

interface CompactDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parseCompactDate(yearMonthDay: string): CompactDate {
  return {
    year: Number(yearMonthDay.slice(0, 2)),
    month: Number(yearMonthDay.slice(2, 4)),
    day: Number(yearMonthDay.slice(4, 6)),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidDate(year: number, month: number, day: number): boolean {
  return (
    month >= FIRST_MONTH &&
    month <= LAST_MONTH &&
    day >= FIRST_DAY &&
    day <= daysInMonth(year, month)
  );
}

export function isValidCompactDateInCentury(
  yearMonthDay: string,
  century: number,
): boolean {
  const { year, month, day } = parseCompactDate(yearMonthDay);
  return isValidDate(century + year, month, day);
}

export function isValidCompactDateInAnyCentury(yearMonthDay: string): boolean {
  return TWO_DIGIT_YEAR_CENTURIES.some((century) =>
    isValidCompactDateInCentury(yearMonthDay, century),
  );
}
