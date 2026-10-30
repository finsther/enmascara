import bankCodes from '../catalogs/bank-codes.json' with { type: 'json' };
import cardNetworks from '../catalogs/card-networks.json' with { type: 'json' };
import { createCardValidator } from './card-validator.js';
import { createClabeValidator } from './clabe-validator.js';
import type { IdentifierValidator } from './identifier-validator.js';

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
  return createValidatorRegistry(
    new Map([
      ['clabe_checksum', createClabeValidator(new Set(bankCodes))],
      ['card_checksum', createCardValidator(cardNetworks)],
    ]),
  );
}
