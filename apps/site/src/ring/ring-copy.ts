import { IDENTIFIER_TYPES, identifierLabel } from './identifier-labels.ts';
import type { RingOptions, RingStrategy } from './ring-options.ts';

const NUMBER_FORMAT = new Intl.NumberFormat('es-MX');
const STRATEGY_LABELS: Readonly<Record<RingStrategy, string>> = {
  halfMask: 'Media máscara',
  fullMask: 'Máscara completa',
  incognito: 'Incógnito',
};

/**
 * Every ring strategy, in the order of the design.
 *
 * @example
 * ```ts
 * RING_STRATEGIES[0]; // 'halfMask'
 * ```
 */
export const RING_STRATEGIES: readonly RingStrategy[] = [
  'halfMask',
  'fullMask',
  'incognito',
];

function counted(count: number, singular: string, plural: string): string {
  return `${NUMBER_FORMAT.format(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Returns the name the ring shows for a strategy.
 *
 * @param strategy - Strategy as the ring names it.
 * @returns The visible name.
 * @example
 * ```ts
 * strategyLabel('incognito'); // 'Incógnito'
 * ```
 */
export function strategyLabel(strategy: RingStrategy): string {
  return STRATEGY_LABELS[strategy];
}

/**
 * Describes how long the input is.
 *
 * @param length - Characters in the input.
 * @returns The count, with thousands grouped as in Mexico.
 * @example
 * ```ts
 * inputSizeLabel(1); // '1 carácter'
 * ```
 */
export function inputSizeLabel(length: number): string {
  return counted(length, 'carácter', 'caracteres');
}

/**
 * Summarizes the findings of the full ring.
 *
 * @param count - Identifiers masked.
 * @returns The count of masked identifiers.
 * @example
 * ```ts
 * maskedCountLabel(3); // '3 enmascarados'
 * ```
 */
export function maskedCountLabel(count: number): string {
  return counted(count, 'enmascarado', 'enmascarados');
}

/**
 * Summarizes the findings of the compact ring.
 *
 * @param count - Identifiers masked.
 * @returns The count of masked data.
 * @example
 * ```ts
 * maskedDataLabel(1); // '1 dato enmascarado'
 * ```
 */
export function maskedDataLabel(count: number): string {
  return counted(count, 'dato enmascarado', 'datos enmascarados');
}

/**
 * Summarizes the chosen options on the folded settings of the mobile ring.
 *
 * @param options - Types and strategy chosen in the ring.
 * @returns The strategy and the types, in the order of the ring.
 * @example
 * ```ts
 * settingsSummary({ detect: ['card'], strategy: 'halfMask' });
 * // 'Media máscara · Tarjeta'
 * ```
 */
export function settingsSummary(options: RingOptions): string {
  const types = IDENTIFIER_TYPES.filter((type) =>
    options.detect.includes(type),
  ).map(identifierLabel);
  return `${strategyLabel(options.strategy)} · ${types.join(', ')}`;
}
