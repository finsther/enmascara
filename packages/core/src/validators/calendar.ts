const FIRST_MONTH = 1;
const LAST_MONTH = 12;
const FIRST_DAY = 1;
const TWO_DIGIT_YEAR_CENTURIES = [1900, 2000] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidDate(year: number, month: number, day: number): boolean {
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
  return isValidDate(
    century + Number(yearMonthDay.slice(0, 2)),
    Number(yearMonthDay.slice(2, 4)),
    Number(yearMonthDay.slice(4, 6)),
  );
}

export function isPossibleCompactDate(yearMonthDay: string): boolean {
  return TWO_DIGIT_YEAR_CENTURIES.some((century) =>
    isValidCompactDateInCentury(yearMonthDay, century),
  );
}
