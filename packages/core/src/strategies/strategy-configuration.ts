import identifiers from '../catalogs/identifiers.json' with { type: 'json' };
import { InvalidConfigurationError } from '../errors.js';
import { createHmacStrategy } from './hmac-strategy.js';
import type { MaskingStrategy } from './masking-strategy.js';
import { createPartialStrategy } from './partial-strategy.js';
import { redactStrategy } from './redact-strategy.js';

export type StrategyName = 'redact' | 'partial' | 'hmac';

export type StrategyByType = Readonly<Record<string, StrategyName>>;

export type StrategyOption = StrategyName | StrategyByType;

const STRATEGY_NAMES: ReadonlySet<string> = new Set([
  'redact',
  'partial',
  'hmac',
]);
const DEFAULT_KEY = 'default';
const DEFAULT_STRATEGY: StrategyName = 'redact';
const MINIMUM_HMAC_KEY_BYTES = 32;

const VISIBLE_CHARACTERS_BY_TYPE: ReadonlyMap<string, number> = new Map(
  Object.entries(identifiers).map(([type, definition]) => [
    type,
    definition.mask.partial.last,
  ]),
);

function checkedName(name: string): StrategyName {
  if (!STRATEGY_NAMES.has(name)) {
    throw new InvalidConfigurationError(
      'strategy names an unknown masking strategy',
    );
  }
  return name as StrategyName;
}

function strategyNamesByType(
  option: StrategyOption,
  types: readonly string[],
): ReadonlyMap<string, StrategyName> {
  if (typeof option === 'string') {
    const name = checkedName(option);
    return new Map(types.map((type) => [type, name]));
  }
  const knownKeys = new Set([
    DEFAULT_KEY,
    ...VISIBLE_CHARACTERS_BY_TYPE.keys(),
  ]);
  if (Object.keys(option).some((key) => !knownKeys.has(key))) {
    throw new InvalidConfigurationError(
      'strategy lists an unknown identifier type',
    );
  }
  const fallback = checkedName(option[DEFAULT_KEY] ?? DEFAULT_STRATEGY);
  return new Map(
    types.map((type) => [type, checkedName(option[type] ?? fallback)]),
  );
}

function hmacKeyBytes(hmacKey: string | Uint8Array | undefined): Uint8Array {
  if (hmacKey === undefined) {
    throw new InvalidConfigurationError(
      'hmacKey is required when a type uses the hmac strategy',
    );
  }
  const bytes =
    typeof hmacKey === 'string' ? new TextEncoder().encode(hmacKey) : hmacKey;
  if (bytes.length < MINIMUM_HMAC_KEY_BYTES) {
    throw new InvalidConfigurationError(
      `hmacKey must have at least ${MINIMUM_HMAC_KEY_BYTES} bytes`,
    );
  }
  return bytes;
}

export function createStrategyResolver(
  option: StrategyOption,
  hmacKey: string | Uint8Array | undefined,
  types: readonly string[],
): (type: string) => MaskingStrategy {
  const namesByType = strategyNamesByType(option, types);
  const usedNames = new Set(namesByType.values());
  const strategies = new Map<StrategyName, MaskingStrategy>([
    ['redact', redactStrategy],
    ['partial', createPartialStrategy(VISIBLE_CHARACTERS_BY_TYPE)],
  ]);
  if (usedNames.has('hmac')) {
    strategies.set('hmac', createHmacStrategy(hmacKeyBytes(hmacKey)));
  }
  return (type) =>
    strategies.get(namesByType.get(type) ?? DEFAULT_STRATEGY) ?? redactStrategy;
}
