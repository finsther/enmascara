import { type CurpRejection, curpRejection } from '../rules/curp.ts';

type CurpProblem = CurpRejection | 'pattern';

export type CurpOutcome = CurpProblem | 'valid';

export interface CurpLineResult {
  readonly line: number;
  readonly outcome: CurpOutcome;
}

export interface CurpReport {
  readonly results: readonly CurpLineResult[];
}

export interface CurpCheckOptions {
  readonly pattern: string;
  readonly stateCodes: ReadonlySet<string>;
}

const OUTCOMES_WITHOUT_A_COMPARABLE_CHECK_DIGIT: readonly CurpOutcome[] = [
  'pattern',
  'check_digit',
];

function describeProblem(problem: CurpProblem): string {
  switch (problem) {
    case 'pattern':
      return 'not shaped like a CURP';
    case 'check_digit':
      return 'the check digit does not match';
    case 'date':
      return 'the birth date is not possible';
    case 'state':
      return 'the state code is not in the catalog';
  }
}

function isProblem(
  result: CurpLineResult,
): result is CurpLineResult & { readonly outcome: CurpProblem } {
  return result.outcome !== 'valid';
}

function outcomeOf(candidate: string, options: CurpCheckOptions): CurpOutcome {
  if (!new RegExp(`^(?:${options.pattern})$`, 'u').test(candidate)) {
    return 'pattern';
  }
  return curpRejection(candidate, options.stateCodes) ?? 'valid';
}

export function reportCurpCheck(
  lines: readonly string[],
  options: CurpCheckOptions,
): CurpReport {
  return {
    results: lines
      .map((text, index) => ({
        line: index + 1,
        candidate: text.trim().toUpperCase(),
      }))
      .filter(({ candidate }) => candidate !== '')
      .map(({ line, candidate }) => ({
        line,
        outcome: outcomeOf(candidate, options),
      })),
  };
}

export function formatCurpReport(report: CurpReport): string {
  const shaped = report.results.filter(
    (result) => result.outcome !== 'pattern',
  );
  const matching = shaped.filter(
    (result) =>
      !OUTCOMES_WITHOUT_A_COMPARABLE_CHECK_DIGIT.includes(result.outcome),
  );
  const summary = `Checked ${shaped.length} CURPs: ${matching.length} with a matching check digit, ${shaped.length - matching.length} without.`;
  const problems = report.results
    .filter(isProblem)
    .map((result) => `Line ${result.line}: ${describeProblem(result.outcome)}`);
  return [summary, ...problems].join('\n');
}
