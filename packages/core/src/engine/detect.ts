import type { IdentifierValidator } from '../validators/identifier-validator.js';
import { type NormalizedText, toOriginalSpan } from './normalize.js';

export type Confidence = 'high' | 'medium' | 'low';

export interface Finding {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly confidence: Confidence;
}

export interface TypeDetector {
  readonly type: string;
  readonly confidence: Confidence;
  readonly pattern: RegExp;
  readonly validator: IdentifierValidator;
}

function isValidFailingClosed(
  validator: IdentifierValidator,
  candidate: string,
): boolean {
  try {
    return validator.isValid(candidate);
  } catch {
    return true;
  }
}

function findingsOf(
  normalized: NormalizedText,
  detector: TypeDetector,
): readonly Finding[] {
  const findings: Finding[] = [];
  const { pattern } = detector;
  pattern.lastIndex = 0;
  for (
    let match = pattern.exec(normalized.text);
    match !== null;
    match = pattern.exec(normalized.text)
  ) {
    const start = match.index;
    const end = start + match[0].length;
    if (isValidFailingClosed(detector.validator, match[0])) {
      findings.push(
        Object.freeze({
          type: detector.type,
          ...toOriginalSpan(normalized, start, end),
          confidence: detector.confidence,
        }),
      );
    } else {
      pattern.lastIndex = start + 1;
    }
  }
  return findings;
}

function byStartThenLongest(first: Finding, second: Finding): number {
  return first.start - second.start || second.end - first.end;
}

function withoutOverlaps(findings: readonly Finding[]): readonly Finding[] {
  const kept: Finding[] = [];
  for (const finding of findings) {
    const previous = kept.at(-1);
    if (previous === undefined || finding.start >= previous.end) {
      kept.push(finding);
    }
  }
  return kept;
}

export function detect(
  normalized: NormalizedText,
  detectors: readonly TypeDetector[],
): readonly Finding[] {
  return withoutOverlaps(
    detectors
      .flatMap((detector) => findingsOf(normalized, detector))
      .sort(byStartThenLongest),
  );
}
