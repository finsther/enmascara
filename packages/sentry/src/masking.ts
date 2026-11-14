import type { Redactor } from 'enmascara';
import { isRecord } from './records.js';
import { withSdkIdentifiers } from './sdk-identifiers.js';

const DROP = null;

function isMaskedCopy<Value extends object>(copy: unknown): copy is Value {
  return isRecord(copy);
}

export function maskOrDrop<Value extends object>(
  redactor: Redactor,
  value: Value | null,
): Value | null {
  if (value === DROP) {
    return DROP;
  }
  try {
    const copy = redactor.object(value);
    return isMaskedCopy<Value>(copy) ? withSdkIdentifiers(value, copy) : DROP;
  } catch {
    return DROP;
  }
}
