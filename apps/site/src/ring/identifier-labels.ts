import type { IdentifierType } from 'enmascara';

/**
 * Every identifier type, in the order the ring shows them.
 *
 * @example
 * ```ts
 * IDENTIFIER_TYPES.length; // 4
 * ```
 */
export const IDENTIFIER_TYPES = [
  'clabe',
  'curp',
  'rfc',
  'card',
] as const satisfies readonly IdentifierType[];

const LABELS: Readonly<Record<string, string>> = {
  clabe: 'CLABE',
  curp: 'CURP',
  rfc: 'RFC',
  card: 'Tarjeta',
};

/**
 * Returns the name the ring shows for an identifier type.
 *
 * @param type - Type as the package names it.
 * @returns The visible name; an unknown type is written in capitals.
 * @example
 * ```ts
 * identifierLabel('card'); // 'Tarjeta'
 * ```
 */
export function identifierLabel(type: string): string {
  return LABELS[type] ?? type.toUpperCase();
}
