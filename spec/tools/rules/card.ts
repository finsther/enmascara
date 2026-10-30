import { luhnCheckDigit } from '../check-digits/luhn.ts';
import type { Rejection } from './rejection.ts';

const CARD_NUMBER_SEPARATORS = /[ -]/g;

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

function belongsToSomeNetwork(
  digits: string,
  networks: readonly CardNetwork[],
): boolean {
  return networks.some(
    (network) =>
      network.lengths.includes(digits.length) &&
      network.prefixes.some((range) => isWithin(digits, range)),
  );
}

export function cardRejection(
  cardNumber: string,
  networks: readonly CardNetwork[],
): Rejection | undefined {
  const digits = cardNumber.replace(CARD_NUMBER_SEPARATORS, '');
  if (luhnCheckDigit(digits.slice(0, -1)) !== digits.slice(-1)) {
    return 'check_digit';
  }
  if (!belongsToSomeNetwork(digits, networks)) {
    return 'network_prefix';
  }
  return undefined;
}
