import type { Redactor } from 'enmascara';
import { isRecord, type SentryRecord } from './records.js';
import {
  isSdkIdentifier,
  isSdkIdentifierKey,
  withSdkIdentifiers,
} from './sdk-identifiers.js';

const REDACTED_NAME = '[REDACTED]';
const NAME_KEYS = ['name', 'description'] as const;
const DIGIT = /\d/;

function isNameKey(key: string): boolean {
  return NAME_KEYS.some((nameKey) => nameKey === key);
}

function isTimingValue(key: string, value: unknown): boolean {
  if (isSdkIdentifierKey(key)) {
    return isSdkIdentifier(value);
  }
  return (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (typeof value === 'string' && !DIGIT.test(value))
  );
}

function reducedSpan(span: object): SentryRecord {
  const reduced: SentryRecord = {};
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(span),
  )) {
    if (isNameKey(key)) {
      reduced[key] = REDACTED_NAME;
    } else if ('value' in descriptor && isTimingValue(key, descriptor.value)) {
      reduced[key] = descriptor.value;
    }
  }
  return reduced;
}

export function maskSpan<Span extends object>(
  redactor: Redactor,
  span: Span,
): Span {
  try {
    const copy = redactor.object(span);
    if (isRecord(copy)) {
      return withSdkIdentifiers(span, copy as Span);
    }
  } catch {
    return reducedSpan(span) as Span;
  }
  return reducedSpan(span) as Span;
}
