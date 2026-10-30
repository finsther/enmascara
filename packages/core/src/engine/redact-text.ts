import { detect, type Finding } from './detect.js';
import type { Engine } from './engine.js';
import { normalizeForDetection } from './normalize.js';

const MINIMUM_DIGITS_IN_ANY_IDENTIFIER = 6;
const DECIMAL_DIGIT = /\p{Nd}/gu;
const LOOKAHEAD_PAST_THE_LIMIT = 256;
const EXCEEDED_LENGTH_MASK = '[REDACTED]';

function hasEnoughDigits(text: string): boolean {
  let digits = 0;
  for (const _digit of text.matchAll(DECIMAL_DIGIT)) {
    digits += 1;
    if (digits === MINIMUM_DIGITS_IN_ANY_IDENTIFIER) {
      return true;
    }
  }
  return false;
}

function scannedPart(input: string, engine: Engine): string {
  return input.slice(0, engine.maxInputLength + LOOKAHEAD_PAST_THE_LIMIT);
}

export function findingsInText(
  input: string,
  engine: Engine,
): readonly Finding[] {
  const scanned = scannedPart(input, engine);
  if (!hasEnoughDigits(scanned)) {
    return [];
  }
  return detect(normalizeForDetection(scanned), engine.detectors).filter(
    (finding) => finding.start < engine.maxInputLength,
  );
}

function keptLength(
  input: string,
  findings: readonly Finding[],
  engine: Engine,
): number {
  const lastEnd = findings.at(-1)?.end ?? 0;
  return Math.min(input.length, Math.max(engine.maxInputLength, lastEnd));
}

export function redactText(input: string, engine: Engine): string {
  const findings = findingsInText(input, engine);
  const kept = keptLength(input, findings, engine);
  const pieces: string[] = [];
  let position = 0;
  for (const finding of findings) {
    pieces.push(
      input.slice(position, finding.start),
      engine.strategy.mask(finding, input.slice(finding.start, finding.end)),
    );
    position = finding.end;
  }
  pieces.push(input.slice(position, kept));
  if (kept < input.length) {
    pieces.push(EXCEEDED_LENGTH_MASK);
  }
  return pieces.join('');
}
