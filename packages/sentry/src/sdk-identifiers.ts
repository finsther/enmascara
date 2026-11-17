import { isRecord, valueAt } from './records.js';

const SDK_IDENTIFIER_PATTERN = /^(?:[\da-f]{16}|[\da-f]{32})$/;
const EVENT_IDENTIFIER_KEYS = ['event_id'] as const;
const SPAN_IDENTIFIER_KEYS = ['trace_id', 'span_id', 'parent_span_id'] as const;
const TRACE_CONTEXT_PATH = ['contexts', 'trace'] as const;
const SPANS_KEY = 'spans';

export type SdkIdentifierKey =
  | (typeof EVENT_IDENTIFIER_KEYS)[number]
  | (typeof SPAN_IDENTIFIER_KEYS)[number];

export function isSdkIdentifier(value: unknown): value is string {
  return typeof value === 'string' && SDK_IDENTIFIER_PATTERN.test(value);
}

export function isSdkIdentifierKey(key: string): key is SdkIdentifierKey {
  return [...EVENT_IDENTIFIER_KEYS, ...SPAN_IDENTIFIER_KEYS].some(
    (identifierKey) => identifierKey === key,
  );
}

function restoreIdentifiers(
  original: object,
  copy: object,
  parentPath: readonly string[],
  keys: readonly string[],
): void {
  const parent = valueAt(copy, parentPath);
  if (!isRecord(parent)) {
    return;
  }
  for (const key of keys) {
    const identifier = valueAt(original, [...parentPath, key]);
    if (isSdkIdentifier(identifier)) {
      parent[key] = identifier;
    }
  }
}

function spanPaths(original: object): readonly (readonly string[])[] {
  const spans = valueAt(original, [SPANS_KEY]);
  return Array.isArray(spans)
    ? spans.map((_, index) => [SPANS_KEY, String(index)])
    : [];
}

export function withSdkIdentifiers<Copy extends object>(
  original: object,
  copy: Copy,
): Copy {
  restoreIdentifiers(
    original,
    copy,
    [],
    [...EVENT_IDENTIFIER_KEYS, ...SPAN_IDENTIFIER_KEYS],
  );
  restoreIdentifiers(original, copy, TRACE_CONTEXT_PATH, SPAN_IDENTIFIER_KEYS);
  for (const path of spanPaths(original)) {
    restoreIdentifiers(original, copy, path, SPAN_IDENTIFIER_KEYS);
  }
  return copy;
}
