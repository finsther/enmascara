import { type CardNetwork, cardRejection } from './card.ts';
import { clabeRejection } from './clabe.ts';
import { curpRejection } from './curp.ts';
import type { Rejection } from './rejection.ts';
import { rfcRejection } from './rfc.ts';

export type IdentifierType = 'card' | 'clabe' | 'curp' | 'rfc';

export interface ReferenceCatalogs {
  readonly bankCodes: ReadonlySet<string>;
  readonly stateCodes: ReadonlySet<string>;
  readonly cardNetworks: readonly CardNetwork[];
}

type RejectionRule = (
  value: string,
  catalogs: ReferenceCatalogs,
) => Rejection | undefined;

const REJECTION_RULES: Readonly<Record<IdentifierType, RejectionRule>> = {
  card: (value, catalogs) => cardRejection(value, catalogs.cardNetworks),
  clabe: (value, catalogs) => clabeRejection(value, catalogs.bankCodes),
  curp: (value, catalogs) => curpRejection(value, catalogs.stateCodes),
  rfc: rfcRejection,
};

export function rejectionFor(
  type: IdentifierType,
  value: string,
  catalogs: ReferenceCatalogs,
): Rejection | undefined {
  return REJECTION_RULES[type](value, catalogs);
}
