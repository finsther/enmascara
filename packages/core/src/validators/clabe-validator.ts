import { clabeCheckDigit } from './clabe-check-digit.js';
import type { IdentifierValidator } from './identifier-validator.js';

const CLABE_SHAPE = /^[0-9]{18}$/;
const BANK_CODE_LENGTH = 3;

export function createClabeValidator(
  bankCodes: ReadonlySet<string>,
): IdentifierValidator {
  return {
    isValid: (candidate) =>
      CLABE_SHAPE.test(candidate) &&
      clabeCheckDigit(candidate.slice(0, -1)) === candidate.slice(-1) &&
      bankCodes.has(candidate.slice(0, BANK_CODE_LENGTH)),
  };
}
