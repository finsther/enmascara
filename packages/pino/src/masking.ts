import type { Redactor } from 'enmascara';

const REDACTED = '[REDACTED]';

type LogRecord = Record<string, unknown>;

function redactedRecord(): LogRecord {
  return { enmascara: REDACTED };
}

function isRecord(value: unknown): value is LogRecord {
  return typeof value === 'object' && value !== null;
}

export function maskRecord(redactor: Redactor, record: object): LogRecord {
  try {
    const masked = redactor.object(record);
    return isRecord(masked) ? { ...masked } : redactedRecord();
  } catch {
    return redactedRecord();
  }
}

function maskValue(redactor: Redactor, value: unknown): unknown {
  try {
    return redactor.object(value);
  } catch {
    return REDACTED;
  }
}

export function maskRecordExcept(
  redactor: Redactor,
  record: object,
  serializedKeys: ReadonlySet<string>,
): LogRecord {
  const entries = Object.entries(record);
  const kept = entries.filter(([key]) => serializedKeys.has(key));
  const masked = maskRecord(
    redactor,
    Object.fromEntries(entries.filter(([key]) => !serializedKeys.has(key))),
  );
  return { ...masked, ...Object.fromEntries(kept) };
}

export function maskingFormatter<Input extends object>(
  redactor: Redactor,
  applicationFormatter: ((input: Input) => object) | undefined,
  serializedKeys: ReadonlySet<string>,
): (input: Input) => LogRecord {
  return (input) =>
    maskRecordExcept(
      redactor,
      applicationFormatter?.(input) ?? input,
      serializedKeys,
    );
}

export function maskingSerializer(
  redactor: Redactor,
  applicationSerializer: ((value: unknown) => unknown) | undefined,
): (value: unknown) => unknown {
  return (value) =>
    maskValue(
      redactor,
      applicationSerializer === undefined
        ? value
        : applicationSerializer(value),
    );
}
