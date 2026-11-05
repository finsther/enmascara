import type { Confidence, Finding } from './engine/detect.js';
import { createEngine } from './engine/engine.js';
import { redactObject } from './engine/redact-object.js';
import { findingsInText, redactText } from './engine/redact-text.js';
import { InvalidConfigurationError } from './errors.js';
import { redactStrategy } from './strategies/redact-strategy.js';

export type { Confidence, Finding };

/** An identifier type that Enmascara can detect. */
export type IdentifierType = 'clabe' | 'curp' | 'rfc' | 'card';

const ALL_IDENTIFIER_TYPES: readonly IdentifierType[] = [
  'clabe',
  'curp',
  'rfc',
  'card',
];
const DEFAULT_MAX_INPUT_LENGTH = 1_000_000;
const DEFAULT_MAX_DEPTH = 32;

/** Options accepted by {@link createRedactor}. */
export interface RedactorOptions {
  /** Identifier types to detect. Defaults to every type. */
  readonly detect?: readonly IdentifierType[];
  /**
   * Characters of each text that are inspected. Whatever exceeds it is
   * replaced by `[REDACTED]`. Defaults to 1,000,000.
   */
  readonly maxInputLength?: number;
  /**
   * Levels of nested objects that `object()` copies. Deeper objects are
   * replaced by `[MaxDepth]`. Defaults to 32.
   */
  readonly maxDepth?: number;
}

/** Masks Mexican identifiers in text and objects. */
export interface Redactor {
  /**
   * Returns the text with every detected identifier replaced by its mask.
   *
   * @param input - Text to redact.
   * @returns The redacted text.
   * @example
   * ```ts
   * createRedactor().text('SPEI a 002180032240946700'); // 'SPEI a [CLABE]'
   * ```
   */
  text(input: string): string;
  /**
   * Returns a deep copy of the value with every string, key and number
   * redacted. The copy has no prototypes and only own data properties;
   * the original value is never modified.
   *
   * @param value - Value to copy and redact.
   * @returns The redacted copy.
   * @example
   * ```ts
   * createRedactor().object({ curp: 'GODE561231HDFRRN00' }); // { curp: '[CURP]' }
   * ```
   */
  object(value: unknown): unknown;
  /**
   * Returns where each identifier is in the text, without masking it and
   * without its value.
   *
   * @param input - Text to inspect.
   * @returns The findings, ordered by position.
   * @example
   * ```ts
   * createRedactor().findings('a 4242424242424242');
   * // [{ type: 'card', start: 2, end: 18, confidence: 'high' }]
   * ```
   */
  findings(input: string): readonly Finding[];
}

function positiveIntegerOption(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new InvalidConfigurationError(`${name} must be a positive integer`);
  }
  return value;
}

function typesToDetect(
  detect: readonly IdentifierType[],
): readonly IdentifierType[] {
  if (detect.length === 0) {
    throw new InvalidConfigurationError(
      'detect must list at least one identifier type',
    );
  }
  return [...new Set(detect)];
}

/**
 * Creates a redactor. Every option is validated here, once, so a redactor
 * never fails later because of its configuration.
 *
 * @param options - Types to detect and limits; every field is optional.
 * @returns A frozen {@link Redactor}.
 * @throws {@link InvalidConfigurationError} If a type is unknown, `detect` is
 * empty, or a limit is not a positive integer.
 * @example
 * ```ts
 * const redact = createRedactor({ detect: ['clabe', 'curp'] });
 * redact.text('SPEI a 002180032240946700 de GODE561231HDFRRN00');
 * // 'SPEI a [CLABE] de [CURP]'
 * ```
 */
export function createRedactor(options: RedactorOptions = {}): Redactor {
  const engine = createEngine({
    types: typesToDetect(options.detect ?? ALL_IDENTIFIER_TYPES),
    maxInputLength: positiveIntegerOption(
      'maxInputLength',
      options.maxInputLength ?? DEFAULT_MAX_INPUT_LENGTH,
    ),
    maxDepth: positiveIntegerOption(
      'maxDepth',
      options.maxDepth ?? DEFAULT_MAX_DEPTH,
    ),
    strategy: redactStrategy,
  });
  return Object.freeze({
    text: (input: string) => redactText(input, engine),
    object: (value: unknown) => redactObject(value, engine),
    findings: (input: string) => findingsInText(input, engine),
  });
}
