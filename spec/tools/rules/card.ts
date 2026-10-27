import { luhnCheckDigit } from '../check-digits/luhn.ts';
import type { Rejection } from './rejection.ts';

const CARD_NUMBER_SEPARATORS = /[ -]/g;

interface PrefixRange {
  readonly from: string;
  readonly to: string;
}

interface CardNetwork {
  readonly length: number;
  readonly prefixes: readonly PrefixRange[];
}

const CARD_NETWORKS: readonly CardNetwork[] = [
  { length: 16, prefixes: [{ from: '4', to: '4' }] },
  {
    length: 16,
    prefixes: [
      { from: '51', to: '55' },
      { from: '2221', to: '2720' },
    ],
  },
  {
    length: 15,
    prefixes: [
      { from: '34', to: '34' },
      { from: '37', to: '37' },
    ],
  },
];

function isWithin(digits: string, range: PrefixRange): boolean {
  const prefix = Number(digits.slice(0, range.from.length));
  return prefix >= Number(range.from) && prefix <= Number(range.to);
}

function belongsToKnownNetwork(digits: string): boolean {
  return CARD_NETWORKS.some(
    (network) =>
      network.length === digits.length &&
      network.prefixes.some((range) => isWithin(digits, range)),
  );
}

export function cardRejection(cardNumber: string): Rejection | undefined {
  const digits = cardNumber.replace(CARD_NUMBER_SEPARATORS, '');
  if (luhnCheckDigit(digits.slice(0, -1)) !== digits.slice(-1)) {
    return 'check_digit';
  }
  if (!belongsToKnownNetwork(digits)) {
    return 'network_prefix';
  }
  return undefined;
}
