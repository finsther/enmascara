import { describe, expect, it } from 'vitest';
import {
  createDefaultValidatorRegistry,
  UnknownValidatorError,
} from '../../src/validators/validator-registry.js';

describe('createDefaultValidatorRegistry', () => {
  const registry = createDefaultValidatorRegistry();

  it('registers the validators of the spec contract', () => {
    expect(registry.names()).toEqual(['card_checksum', 'clabe_checksum']);
  });

  it('checks CLABE against the generated bank catalog', () => {
    const validator = registry.validatorFor('clabe_checksum');

    expect(validator.isValid('002180032240946700')).toBe(true);
    expect(validator.isValid('999180032240946703')).toBe(false);
  });

  it('checks cards against the generated network catalog', () => {
    const validator = registry.validatorFor('card_checksum');

    expect(validator.isValid('6011111111111117')).toBe(true);
    expect(validator.isValid('9000000000000001')).toBe(false);
  });

  it('refuses a validator name outside the registry', () => {
    expect(() => registry.validatorFor('curp_checksum')).toThrow(
      new UnknownValidatorError('curp_checksum'),
    );
  });

  it('names the unknown validator in a typed error', () => {
    const error = new UnknownValidatorError('regex_only');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnknownValidatorError');
    expect(error.message).toBe('No validator is registered as regex_only');
  });
});
