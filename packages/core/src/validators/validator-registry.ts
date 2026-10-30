import bankCodes from '../catalogs/bank-codes.json' with { type: 'json' };
import cardNetworks from '../catalogs/card-networks.json' with { type: 'json' };
import identifiers from '../catalogs/identifiers.json' with { type: 'json' };
import stateCodes from '../catalogs/state-codes.json' with { type: 'json' };
import { createAllowlistedValidator } from './allowlisted-validator.js';
import { createCardValidator } from './card-validator.js';
import { createClabeValidator } from './clabe-validator.js';
import { createCurpValidator } from './curp-validator.js';
import type { IdentifierValidator } from './identifier-validator.js';
import { createRfcValidator } from './rfc-validator.js';

export class UnknownValidatorError extends Error {
  override readonly name = 'UnknownValidatorError';

  constructor(validatorName: string) {
    super(`No validator is registered as ${validatorName}`);
  }
}

export interface ValidatorRegistry {
  names(): readonly string[];
  validatorFor(validatorName: string): IdentifierValidator;
}

interface IdentifierDefinition {
  readonly validator: string;
  readonly allowlist?: readonly string[];
}

const IDENTIFIER_DEFINITIONS: readonly IdentifierDefinition[] =
  Object.values(identifiers);

function allowlistFor(validatorName: string): ReadonlySet<string> {
  return new Set(
    IDENTIFIER_DEFINITIONS.filter(
      (definition) => definition.validator === validatorName,
    ).flatMap((definition) => definition.allowlist ?? []),
  );
}

function createValidatorRegistry(
  validators: ReadonlyMap<string, IdentifierValidator>,
): ValidatorRegistry {
  return {
    names: () => [...validators.keys()].sort(),
    validatorFor: (validatorName) => {
      const validator = validators.get(validatorName);
      if (validator === undefined) {
        throw new UnknownValidatorError(validatorName);
      }
      return validator;
    },
  };
}

export function createDefaultValidatorRegistry(): ValidatorRegistry {
  const validators: ReadonlyMap<string, IdentifierValidator> = new Map([
    ['clabe_checksum', createClabeValidator(new Set(bankCodes))],
    ['card_checksum', createCardValidator(cardNetworks)],
    ['curp_checksum', createCurpValidator(new Set(stateCodes))],
    ['rfc_checksum', createRfcValidator()],
  ]);
  return createValidatorRegistry(
    new Map(
      [...validators].map(([validatorName, validator]) => [
        validatorName,
        createAllowlistedValidator(validator, allowlistFor(validatorName)),
      ]),
    ),
  );
}
