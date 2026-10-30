import { luhnCheckDigit } from '../check-digits/luhn.ts';
import type { CardNetwork, PrefixRange } from '../rules/card.ts';
import type { ReferenceCatalogs } from '../rules/index.ts';
import {
  type GeneratedValues,
  invalidValuesFrom,
  validValuesFrom,
} from './fixture-values.ts';
import type { Random } from './random.ts';

const DIGITS = '0123456789';
const DECIMAL_BASE = 10;
const SIXTEEN_DIGIT_LENGTH = 16;
const FIFTEEN_DIGIT_LENGTH = 15;
const SIXTEEN_DIGIT_GROUPS = [4, 4, 4, 4] as const;
const FIFTEEN_DIGIT_GROUPS = [4, 6, 5] as const;
const SEPARATORS = ['', ' ', '-'] as const;
const PREFIXES_OUTSIDE_CARD_NETWORKS = ['1', '7', '9'] as const;

interface CardShape {
  readonly prefix: string;
  readonly length: number;
}

function prefixWithin(random: Random, range: PrefixRange): string {
  return String(random.integer(Number(range.from), Number(range.to))).padStart(
    range.from.length,
    '0',
  );
}

function shapeOf(random: Random, network: CardNetwork): CardShape {
  return {
    prefix: prefixWithin(random, random.pick(network.prefixes)),
    length: random.pick(network.lengths),
  };
}

function withCheckDigit(random: Random, shape: CardShape): string {
  const body = `${shape.prefix}${random.characters(
    DIGITS,
    shape.length - shape.prefix.length - 1,
  )}`;
  return `${body}${luhnCheckDigit(body)}`;
}

function grouped(digits: string, separator: string): string {
  const groups =
    digits.length === FIFTEEN_DIGIT_LENGTH
      ? FIFTEEN_DIGIT_GROUPS
      : SIXTEEN_DIGIT_GROUPS;
  return groups
    .map((size, index) => {
      const start = groups
        .slice(0, index)
        .reduce((total, group) => total + group, 0);
      return digits.slice(start, start + size);
    })
    .join(separator);
}

function unknownNetworkShape(random: Random): CardShape {
  return random.pick([
    {
      prefix: random.pick(PREFIXES_OUTSIDE_CARD_NETWORKS),
      length: SIXTEEN_DIGIT_LENGTH,
    },
    { prefix: random.pick(['34', '37']), length: SIXTEEN_DIGIT_LENGTH },
    { prefix: '4', length: FIFTEEN_DIGIT_LENGTH },
  ]);
}

function withWrongCheckDigit(cardNumber: string, random: Random): string {
  const wrongDigit =
    (Number(cardNumber.slice(-1)) + random.integer(1, 9)) % DECIMAL_BASE;
  return `${cardNumber.slice(0, -1)}${wrongDigit}`;
}

export function generateCardValues(
  random: Random,
  catalogs: ReferenceCatalogs,
): GeneratedValues {
  const networks = [...catalogs.cardNetworks].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const knownNetworkShape = (): CardShape =>
    shapeOf(random, random.pick(networks));
  const validCard = (): string =>
    grouped(
      withCheckDigit(random, knownNetworkShape()),
      random.pick(SEPARATORS),
    );
  return {
    valid: validValuesFrom(validCard),
    invalid: invalidValuesFrom([
      [
        'check_digit',
        () =>
          withWrongCheckDigit(
            withCheckDigit(random, knownNetworkShape()),
            random,
          ),
      ],
      [
        'network_prefix',
        () => withCheckDigit(random, unknownNetworkShape(random)),
      ],
    ]),
  };
}
