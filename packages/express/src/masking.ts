import type { Redactor } from 'enmascara';
import {
  hasMaskableHeaders,
  withoutCredentialHeaders,
} from './credential-headers.js';
import { isRecord, type UnknownRecord } from './records.js';
import { REDACTED } from './redacted.js';

export type RedactedRecord = Readonly<{ enmascara: typeof REDACTED }>;

export const REDACTED_RECORD: RedactedRecord = Object.freeze({
  enmascara: REDACTED,
});

function withMaskedHeaders(record: UnknownRecord): UnknownRecord {
  const { headers } = record;
  return headers === undefined
    ? { ...record }
    : { ...record, headers: withoutCredentialHeaders(headers) };
}

export function maskRecord(
  redactor: Redactor,
  value: unknown,
): UnknownRecord | RedactedRecord {
  try {
    const masked = redactor.object(value);
    return isRecord(masked) ? masked : REDACTED_RECORD;
  } catch {
    return REDACTED_RECORD;
  }
}

export function maskHttpRecord(
  redactor: Redactor,
  value: unknown,
): UnknownRecord | RedactedRecord {
  const masked = maskRecord(redactor, value);
  return hasMaskableHeaders(masked)
    ? withMaskedHeaders(masked)
    : REDACTED_RECORD;
}
