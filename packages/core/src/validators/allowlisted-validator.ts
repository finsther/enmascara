import type { IdentifierValidator } from './identifier-validator.js';

export function createAllowlistedValidator(
  validator: IdentifierValidator,
  allowlist: ReadonlySet<string>,
): IdentifierValidator {
  return {
    isValid: (candidate) =>
      !allowlist.has(candidate) && validator.isValid(candidate),
  };
}
