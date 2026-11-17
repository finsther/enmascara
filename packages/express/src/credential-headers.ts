import credentialHeaderNames from './catalogs/credential-headers.json' with {
  type: 'json',
};
import type { UnknownRecord } from './records.js';
import { REDACTED } from './redacted.js';

const CREDENTIAL_HEADER_NAMES: ReadonlySet<string> = new Set(
  credentialHeaderNames,
);

export function isCredentialHeader(name: string): boolean {
  return CREDENTIAL_HEADER_NAMES.has(name.toLowerCase());
}

export function withoutCredentialValues(headers: UnknownRecord): UnknownRecord {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      isCredentialHeader(name) ? REDACTED : value,
    ]),
  );
}
