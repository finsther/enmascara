import { cardRejection } from './card.ts';
import { clabeRejection } from './clabe.ts';
import type { Rejection } from './rejection.ts';
import { rfcRejection } from './rfc.ts';

export type IdentifierType = 'card' | 'clabe' | 'rfc';

export interface ReferenceCatalogs {
  readonly bankCodes: ReadonlySet<string>;
}

type RejectionRule = (
  value: string,
  catalogs: ReferenceCatalogs,
) => Rejection | undefined;

const REJECTION_RULES: Readonly<Record<IdentifierType, RejectionRule>> = {
  card: cardRejection,
  clabe: (value, catalogs) => clabeRejection(value, catalogs.bankCodes),
  rfc: rfcRejection,
};

export function rejectionFor(
  type: IdentifierType,
  value: string,
  catalogs: ReferenceCatalogs,
): Rejection | undefined {
  return REJECTION_RULES[type](value, catalogs);
}
