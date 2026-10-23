import type { IdentifierType } from '../rules/index.ts';
import { generateCardValues } from './card.ts';
import { generateClabeValues } from './clabe.ts';
import type { GeneratedValues } from './fixture-values.ts';
import { createRandom, type Random } from './random.ts';
import { generateRfcValues } from './rfc.ts';

export {
  type GeneratedValues,
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from './fixture-values.ts';

export interface GeneratorOptions {
  readonly seed: number;
  readonly bankCodes: ReadonlySet<string>;
}

type ValueGenerator = (
  random: Random,
  bankCodes: ReadonlySet<string>,
) => GeneratedValues;

const VALUE_GENERATORS: Readonly<Record<IdentifierType, ValueGenerator>> = {
  card: generateCardValues,
  clabe: generateClabeValues,
  rfc: generateRfcValues,
};

export function generateFixtureValues(
  type: IdentifierType,
  options: GeneratorOptions,
): GeneratedValues {
  return VALUE_GENERATORS[type](createRandom(options.seed), options.bankCodes);
}
