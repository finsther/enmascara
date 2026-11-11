import { describe, expect, it } from 'vitest';
import { createRedactor } from '../src/index.js';

const ONE_MEBIBYTE = 1_048_576;
const TIME_BUDGET_MILLISECONDS = 5_000;
const TEST_TIMEOUT_MILLISECONDS = 60_000;
const PSEUDO_RANDOM_SEED = 20261105;
const PRINTABLE_ASCII_START = 32;
const PRINTABLE_ASCII_COUNT = 95;
const STRINGS_IN_THE_OBJECT = 50_000;

function filled(unit: string): string {
  return unit
    .repeat(Math.ceil(ONE_MEBIBYTE / unit.length))
    .slice(0, ONE_MEBIBYTE);
}

function pseudoRandomText(): string {
  let state = PSEUDO_RANDOM_SEED;
  return Array.from({ length: ONE_MEBIBYTE }, () => {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
    return String.fromCharCode(
      PRINTABLE_ASCII_START + (state % PRINTABLE_ASCII_COUNT),
    );
  }).join('');
}

function elapsedMilliseconds(work: () => unknown): number {
  const start = performance.now();
  work();
  return performance.now() - start;
}

const ADVERSARIAL_INPUTS: readonly (readonly [string, () => string])[] = [
  ['digits separated by spaces', () => filled('0 ')],
  [
    'CLABEs with a wrong check digit, one after another',
    () => filled('002180032240946701 '),
  ],
  ['CURP shapes with zero-width spaces', () => filled('GODE561231​HDFRRN0')],
  ['pseudo-random printable text', pseudoRandomText],
];

describe('fuzzing with 1 MiB inputs', () => {
  const redact = createRedactor({ maxInputLength: 2 * ONE_MEBIBYTE });

  it.each(ADVERSARIAL_INPUTS)(
    'redacts %s within the time budget',
    (_description, build) => {
      const input = build();

      expect(input).toHaveLength(ONE_MEBIBYTE);
      expect(elapsedMilliseconds(() => redact.text(input))).toBeLessThan(
        TIME_BUDGET_MILLISECONDS,
      );
      expect(elapsedMilliseconds(() => redact.findings(input))).toBeLessThan(
        TIME_BUDGET_MILLISECONDS,
      );
    },
    TEST_TIMEOUT_MILLISECONDS,
  );

  it(
    'redacts an object of about 1 MiB of strings within the time budget',
    () => {
      const payload = Array.from(
        { length: STRINGS_IN_THE_OBJECT },
        (_unused, index) => ({
          id: index,
          note: `ref 002180032240946700 ${index}`,
        }),
      );

      expect(elapsedMilliseconds(() => redact.object(payload))).toBeLessThan(
        TIME_BUDGET_MILLISECONDS,
      );
    },
    TEST_TIMEOUT_MILLISECONDS,
  );
});
