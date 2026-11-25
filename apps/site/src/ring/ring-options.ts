import type { IdentifierType, RedactorOptions, StrategyName } from 'enmascara';

/**
 * Masking strategy as the ring names it: Máscara completa, Media máscara or
 * Incógnito.
 */
export type RingStrategy = 'fullMask' | 'halfMask' | 'incognito';

/** What the visitor chose in the ring. */
export interface RingOptions {
  /** Identifier types to detect; the ring always keeps at least one. */
  readonly detect: readonly [IdentifierType, ...IdentifierType[]];
  /** How the detected values are masked. */
  readonly strategy: RingStrategy;
}

/**
 * Public key that the ring uses for the Incógnito strategy. It is published
 * on purpose and must never protect real data.
 *
 * @example
 * ```ts
 * createRedactor({ strategy: 'hmac', hmacKey: DEMO_HMAC_KEY });
 * ```
 */
export const DEMO_HMAC_KEY =
  'enmascara-ring-public-demo-key-never-use-in-production';

const PACKAGE_STRATEGY: Readonly<Record<RingStrategy, StrategyName>> = {
  fullMask: 'redact',
  halfMask: 'partial',
  incognito: 'hmac',
};

/**
 * Translates the ring options into the options of `createRedactor`.
 *
 * @param options - Types and strategy chosen in the ring.
 * @returns Redactor options; Incógnito carries {@link DEMO_HMAC_KEY}.
 * @example
 * ```ts
 * redactorOptions({ detect: ['clabe'], strategy: 'halfMask' });
 * // { detect: ['clabe'], strategy: 'partial' }
 * ```
 */
export function redactorOptions(options: RingOptions): RedactorOptions {
  const strategy = PACKAGE_STRATEGY[options.strategy];
  const detect = [...options.detect];
  if (strategy === 'hmac') {
    return { detect, strategy, hmacKey: DEMO_HMAC_KEY };
  }
  return { detect, strategy };
}
