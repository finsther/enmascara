import { isRecord, valueAt } from './records.js';

const SDK_IDENTIFIER_PATTERN = /^(?:[\da-f]{16}|[\da-f]{32})$/;
const TRACE_CONTEXT_PATH = ['contexts', 'trace'] as const;

interface IdentifierLocation {
  readonly parentPath: readonly string[];
  readonly key: string;
}

const SDK_IDENTIFIER_LOCATIONS: readonly IdentifierLocation[] = [
  { parentPath: [], key: 'event_id' },
  { parentPath: TRACE_CONTEXT_PATH, key: 'trace_id' },
  { parentPath: TRACE_CONTEXT_PATH, key: 'span_id' },
  { parentPath: TRACE_CONTEXT_PATH, key: 'parent_span_id' },
];

function isSdkIdentifier(value: unknown): value is string {
  return typeof value === 'string' && SDK_IDENTIFIER_PATTERN.test(value);
}

export function withSdkIdentifiers<Copy extends object>(
  original: object,
  copy: Copy,
): Copy {
  for (const { parentPath, key } of SDK_IDENTIFIER_LOCATIONS) {
    const identifier = valueAt(original, [...parentPath, key]);
    const parent = valueAt(copy, parentPath);
    if (isSdkIdentifier(identifier) && isRecord(parent)) {
      parent[key] = identifier;
    }
  }
  return copy;
}
