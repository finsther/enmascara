import { luhnCheckDigit } from '../check-digits/luhn.ts';
import {
  FIXTURES_PER_REJECTION,
  type GeneratedValues,
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from './fixture-values.ts';
import type { Random } from './random.ts';
import { uniqueValues } from './unique.ts';

const DIGITS = '0123456789';
const DECIMAL_BASE = 10;
const SIXTEEN_DIGIT_GROUPS = [4, 4, 4, 4] as const;
const FIFTEEN_DIGIT_GROUPS = [4, 6, 5] as const;
const SEPARATORS = ['', ' ', '-'] as const;
const MASTERCARD_TWO_SERIES_FIRST = 2221;
const MASTERCARD_TWO_SERIES_LAST = 2720;
const MASTERCARD_FIVE_SERIES_FIRST = 51;
const MASTERCARD_FIVE_SERIES_LAST = 55;
const PREFIXES_OUTSIDE_CARD_NETWORKS = ['1', '7', '8', '9'] as const;

interface CardShape {
  readonly prefix: string;
  readonly groups: readonly number[];
}

function lengthOf(groups: readonly number[]): number {
  return groups.reduce((total, group) => total + group, 0);
}

function withCheckDigit(random: Random, shape: CardShape): string {
  const body = `${shape.prefix}${random.characters(
    DIGITS,
    lengthOf(shape.groups) - shape.prefix.length - 1,
  )}`;
  return `${body}${luhnCheckDigit(body)}`;
}

function grouped(
  digits: string,
  groups: readonly number[],
  separator: string,
): string {
  return groups
    .map((size, index) => {
      const start = lengthOf(groups.slice(0, index));
      return digits.slice(start, start + size);
    })
    .join(separator);
}

function knownNetworkShape(random: Random): CardShape {
  return random.pick([
    { prefix: '4', groups: SIXTEEN_DIGIT_GROUPS },
    {
      prefix: String(
        random.integer(
          MASTERCARD_FIVE_SERIES_FIRST,
          MASTERCARD_FIVE_SERIES_LAST,
        ),
      ),
      groups: SIXTEEN_DIGIT_GROUPS,
    },
    {
      prefix: String(
        random.integer(MASTERCARD_TWO_SERIES_FIRST, MASTERCARD_TWO_SERIES_LAST),
      ),
      groups: SIXTEEN_DIGIT_GROUPS,
    },
    { prefix: random.pick(['34', '37']), groups: FIFTEEN_DIGIT_GROUPS },
  ]);
}

function unknownNetworkShape(random: Random): CardShape {
  return random.pick([
    {
      prefix: random.pick(PREFIXES_OUTSIDE_CARD_NETWORKS),
      groups: SIXTEEN_DIGIT_GROUPS,
    },
    { prefix: random.pick(['34', '37']), groups: SIXTEEN_DIGIT_GROUPS },
    { prefix: '4', groups: FIFTEEN_DIGIT_GROUPS },
  ]);
}

function withWrongCheckDigit(cardNumber: string, random: Random): string {
  const wrongDigit =
    (Number(cardNumber.slice(-1)) + random.integer(1, 9)) % DECIMAL_BASE;
  return `${cardNumber.slice(0, -1)}${wrongDigit}`;
}

export function generateCardValues(random: Random): GeneratedValues {
  const validCard = (): string => {
    const shape = knownNetworkShape(random);
    return grouped(
      withCheckDigit(random, shape),
      shape.groups,
      random.pick(SEPARATORS),
    );
  };
  const byValue = (fixture: InvalidValue): string => fixture.value;
  return {
    valid: uniqueValues(MINIMUM_FIXTURES_PER_GROUP, validCard, String),
    invalid: [
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: withWrongCheckDigit(
            withCheckDigit(random, knownNetworkShape(random)),
            random,
          ),
          reason: 'check_digit' as const,
        }),
        byValue,
      ),
      ...uniqueValues(
        FIXTURES_PER_REJECTION,
        () => ({
          value: withCheckDigit(random, unknownNetworkShape(random)),
          reason: 'network_prefix' as const,
        }),
        byValue,
      ),
    ],
  };
}
