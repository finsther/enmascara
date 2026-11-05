import { canonicalValue } from './canonical-value.js';
import type { MaskingStrategy } from './masking-strategy.js';

const HIDDEN_CHARACTER = '*';
const NOTHING_VISIBLE = 0;

export function createPartialStrategy(
  visibleCharactersByType: ReadonlyMap<string, number>,
): MaskingStrategy {
  return {
    mask: (finding, value) => {
      const canonical = canonicalValue(value);
      const hiddenLength =
        canonical.length -
        (visibleCharactersByType.get(finding.type) ?? NOTHING_VISIBLE);
      return `${HIDDEN_CHARACTER.repeat(hiddenLength)}${canonical.slice(hiddenLength)}`;
    },
  };
}
