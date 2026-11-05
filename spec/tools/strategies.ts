import { createHmac } from 'node:crypto';

const INVISIBLE_CHARACTER = /^\p{Default_Ignorable_Code_Point}$/u;
const NOT_PART_OF_AN_IDENTIFIER = /[^0-9A-ZÑ&]/gu;
const TAG_LENGTH = 6;
const HIDDEN_CHARACTER = '*';

export type StrategyName = 'redact' | 'partial' | 'hmac';

export interface MaskRequest {
  readonly type: string;
  readonly value: string;
  readonly visible: number;
  readonly key: string;
}

export function canonicalValue(value: string): string {
  return [...value]
    .filter((character) => !INVISIBLE_CHARACTER.test(character))
    .map((character) => character.normalize('NFKC').toUpperCase())
    .join('')
    .replace(NOT_PART_OF_AN_IDENTIFIER, '');
}

export function maskWith(strategy: StrategyName, request: MaskRequest): string {
  const label = request.type.toUpperCase();
  const canonical = canonicalValue(request.value);
  switch (strategy) {
    case 'redact':
      return `[${label}]`;
    case 'partial':
      return `${HIDDEN_CHARACTER.repeat(canonical.length - request.visible)}${canonical.slice(-request.visible)}`;
    case 'hmac': {
      const digest = createHmac('sha256', request.key)
        .update(`${request.type}:${canonical}`)
        .digest('hex');
      return `[${label}:${digest.slice(0, TAG_LENGTH)}]`;
    }
  }
}
