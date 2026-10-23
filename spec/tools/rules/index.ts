import { cardRejection } from './card.ts';
import { clabeRejection } from './clabe.ts';
import type { Rejection } from './rejection.ts';
import { rfcRejection } from './rfc.ts';

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
