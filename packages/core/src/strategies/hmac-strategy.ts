import { canonicalValue } from './canonical-value.js';
import type { MaskingStrategy } from './masking-strategy.js';
import { hmacSha256 } from './sha256.js';

const TAG_BYTES = 3;
const HEXADECIMAL = 16;
const HEXADECIMAL_DIGITS_PER_BYTE = 2;

function hexadecimal(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) =>
    byte.toString(HEXADECIMAL).padStart(HEXADECIMAL_DIGITS_PER_BYTE, '0'),
  ).join('');
}

export function createHmacStrategy(key: Uint8Array): MaskingStrategy {
  const encoder = new TextEncoder();
  return {
    mask: (finding, value) => {
      const message = encoder.encode(
        `${finding.type}:${canonicalValue(value)}`,
      );
      const tag = hexadecimal(hmacSha256(key, message).slice(0, TAG_BYTES));
      return `[${finding.type.toUpperCase()}:${tag}]`;
    },
  };
}
