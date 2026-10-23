import type { IdentifierType } from '../rules/index.js';
import { generateCardValues } from './card.js';
import { generateClabeValues } from './clabe.js';
import type { GeneratedValues } from './fixture-values.js';
import { createRandom, type Random } from './random.js';
import { generateRfcValues } from './rfc.js';

export {
  type GeneratedValues,
  type InvalidValue,
  MINIMUM_FIXTURES_PER_GROUP,
} from './fixture-values.js';

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
