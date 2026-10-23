import type { IdentifierType, ReferenceCatalogs } from '../rules/index.ts';
import { generateCardValues } from './card.ts';
import { generateClabeValues } from './clabe.ts';
import { generateCurpValues } from './curp.ts';
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
  readonly catalogs: ReferenceCatalogs;
}

type ValueGenerator = (
  random: Random,
  catalogs: ReferenceCatalogs,
) => GeneratedValues;

const VALUE_GENERATORS: Readonly<Record<IdentifierType, ValueGenerator>> = {
  card: generateCardValues,
  clabe: generateClabeValues,
  curp: generateCurpValues,
  rfc: generateRfcValues,
};

export function generateFixtureValues(
  type: IdentifierType,
  options: GeneratorOptions,
): GeneratedValues {
  return VALUE_GENERATORS[type](createRandom(options.seed), options.catalogs);
}
