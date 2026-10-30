import type { IdentifierValidator } from './identifier-validator.js';
import { luhnCheckDigit } from './luhn.js';

const CARD_NUMBER_SEPARATORS = /[ -]/g;
const CARD_DIGITS_SHAPE = /^[0-9]+$/;

export interface PrefixRange {
  readonly from: string;
  readonly to: string;
}

export interface CardNetwork {
  readonly name: string;
  readonly lengths: readonly number[];
  readonly prefixes: readonly PrefixRange[];
}

function isWithin(digits: string, range: PrefixRange): boolean {
  const prefix = Number(digits.slice(0, range.from.length));
  return prefix >= Number(range.from) && prefix <= Number(range.to);
}

function belongsTo(digits: string, network: CardNetwork): boolean {
  return (
    network.lengths.includes(digits.length) &&
    network.prefixes.some((range) => isWithin(digits, range))
  );
}

export function createCardValidator(
  networks: readonly CardNetwork[],
): IdentifierValidator {
  return {
    isValid: (candidate) => {
      const digits = candidate.replace(CARD_NUMBER_SEPARATORS, '');
      return (
        CARD_DIGITS_SHAPE.test(digits) &&
        luhnCheckDigit(digits.slice(0, -1)) === digits.slice(-1) &&
        networks.some((network) => belongsTo(digits, network))
      );
    },
  };
}
