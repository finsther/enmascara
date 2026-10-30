import { describe, expect, it } from 'vitest';
import { createAllowlistedValidator } from '../../src/validators/allowlisted-validator.js';
import type { IdentifierValidator } from '../../src/validators/identifier-validator.js';

const ACCEPTS_EVERYTHING: IdentifierValidator = { isValid: () => true };
const REJECTS_EVERYTHING: IdentifierValidator = { isValid: () => false };
const ALLOWLIST: ReadonlySet<string> = new Set(['XEXX010101000']);

describe('createAllowlistedValidator', () => {
  it('rejects an allowlisted value even if the wrapped validator accepts it', () => {
    const validator = createAllowlistedValidator(ACCEPTS_EVERYTHING, ALLOWLIST);

    expect(validator.isValid('XEXX010101000')).toBe(false);
  });

  it('accepts what the wrapped validator accepts outside the allowlist', () => {
    const validator = createAllowlistedValidator(ACCEPTS_EVERYTHING, ALLOWLIST);

    expect(validator.isValid('GODE561231GR8')).toBe(true);
  });

  it('rejects what the wrapped validator rejects', () => {
    const validator = createAllowlistedValidator(REJECTS_EVERYTHING, ALLOWLIST);

    expect(validator.isValid('GODE561231GR8')).toBe(false);
  });
});
