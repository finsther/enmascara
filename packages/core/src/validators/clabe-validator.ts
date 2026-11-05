import { clabeCheckDigit } from './clabe-check-digit.js';
import type { IdentifierValidator } from './identifier-validator.js';

const CLABE_SHAPE = /^[0-9](?:[ -]?[0-9]){17}$/;
const BANK_CODE_LENGTH = 3;
const CLABE_SEPARATORS = /[ -]/g;

export function createClabeValidator(
  bankCodes: ReadonlySet<string>,
): IdentifierValidator {
  return {
    isValid: (candidate) => {
      const clabe = candidate.replace(CLABE_SEPARATORS, '');
      return (
        CLABE_SHAPE.test(candidate) &&
        clabeCheckDigit(clabe.slice(0, -1)) === clabe.slice(-1) &&
        bankCodes.has(clabe.slice(0, BANK_CODE_LENGTH))
      );
    },
  };
}
