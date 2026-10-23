import { cardRejection } from './card.js';
import { clabeRejection } from './clabe.js';
import type { Rejection } from './rejection.js';
import { rfcRejection } from './rfc.js';

export type IdentifierType = 'card' | 'clabe' | 'rfc';

type RejectionRule = (
  value: string,
  bankCodes: ReadonlySet<string>,
) => Rejection | undefined;

const REJECTION_RULES: Readonly<Record<IdentifierType, RejectionRule>> = {
  card: cardRejection,
  clabe: clabeRejection,
  rfc: rfcRejection,
};

export function rejectionFor(
  type: IdentifierType,
  value: string,
  bankCodes: ReadonlySet<string>,
): Rejection | undefined {
  return REJECTION_RULES[type](value, bankCodes);
}
