export type SentryRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is SentryRecord {
  return typeof value === 'object' && value !== null;
}

export function ownDataValue(source: unknown, key: string): unknown {
  if (!isRecord(source)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  return descriptor !== undefined && 'value' in descriptor
    ? descriptor.value
    : undefined;
}

export function valueAt(source: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (parent, key) => ownDataValue(parent, key),
    source,
  );
}
