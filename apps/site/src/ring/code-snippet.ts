import type { IdentifierType } from 'enmascara';
import { IDENTIFIER_TYPES } from './identifier-labels.ts';
import { type RingOptions, redactorOptions } from './ring-options.ts';

const HMAC_KEY_LINE = '  hmacKey: process.env.ENMASCARA_HMAC_KEY,';

function quoted(value: string): string {
  return `'${value}'`;
}

function detectLines(detect: readonly IdentifierType[]): readonly string[] {
  if (new Set(detect).size === IDENTIFIER_TYPES.length) {
    return [];
  }
  return [`  detect: [${detect.map(quoted).join(', ')}],`];
}

function keyLines(options: RingOptions): readonly string[] {
  return options.strategy === 'incognito' ? [HMAC_KEY_LINE] : [];
}

/**
 * Writes the code that masks like the ring with the chosen options. It is
 * built only from the options, never from the input, and reads the hmac key
 * from `ENMASCARA_HMAC_KEY` instead of showing the demo key.
 *
 * @param options - Types and strategy chosen in the ring.
 * @returns JavaScript that creates the redactor and masks `text`.
 * @example
 * ```ts
 * codeSnippet({ detect: ['clabe'], strategy: 'fullMask' });
 * ```
 */
export function codeSnippet(options: RingOptions): string {
  const { strategy } = redactorOptions(options);
  return [
    "import { createRedactor } from 'enmascara';",
    '',
    'const redact = createRedactor({',
    ...detectLines(options.detect),
    `  strategy: ${quoted(String(strategy))},`,
    ...keyLines(options),
    '});',
    '',
    'const masked = redact.text(text);',
  ].join('\n');
}
