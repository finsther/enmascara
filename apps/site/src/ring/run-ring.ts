import { createRedactor, type Finding, type Redactor } from 'enmascara';
import { lineNumberAt } from './line-number.ts';
import { type RingOptions, redactorOptions } from './ring-options.ts';

/** One row of the findings table. It never holds the detected value. */
export interface FindingRow {
  /** Identifier type, as the package names it. */
  readonly type: string;
  /** Line of the input where the identifier starts, counted from 1. */
  readonly line: number;
  /** What the redactor writes in place of the identifier. */
  readonly result: string;
}

/** What the ring shows for one input. */
export interface RingResult {
  /** The input with every detected identifier masked. */
  readonly output: string;
  /** One row per finding, in the order of the input. */
  readonly rows: readonly FindingRow[];
}

const FAILED_RESULT: RingResult = { output: '[REDACTED]', rows: [] };

function findingRow(
  redactor: Redactor,
  input: string,
  finding: Finding,
): FindingRow {
  return {
    type: finding.type,
    line: lineNumberAt(input, finding.start),
    result: redactor.text(input.slice(finding.start, finding.end)),
  };
}

function maskedResult(input: string, options: RingOptions): RingResult {
  const redactor = createRedactor(redactorOptions(options));
  return {
    output: redactor.text(input),
    rows: redactor
      .findings(input)
      .map((finding) => findingRow(redactor, input, finding)),
  };
}

/**
 * Masks the input with the options chosen in the ring and lists what it
 * found. If the redactor fails, everything is masked and nothing is listed.
 *
 * @param input - Text the visitor wrote or pasted.
 * @param options - Types and strategy chosen in the ring.
 * @returns The masked text and the findings table.
 * @example
 * ```ts
 * runRing('SPEI a 002180032240946700', { detect: ['clabe'], strategy: 'fullMask' });
 * // { output: 'SPEI a [CLABE]', rows: [{ type: 'clabe', line: 1, result: '[CLABE]' }] }
 * ```
 */
export function runRing(input: string, options: RingOptions): RingResult {
  try {
    return maskedResult(input, options);
  } catch {
    return FAILED_RESULT;
  }
}
