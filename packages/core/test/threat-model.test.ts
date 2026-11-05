import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRedactor, InvalidConfigurationError } from '../src/index.js';

const LONGEST_ARBITRARY_TEXT = 256;
const CURP = 'GODE561231HDFRRN00';

describe('threat model: errors never leak a detected value', () => {
  const redact = createRedactor();

  it('never throws while redacting or inspecting any text', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary', maxLength: LONGEST_ARBITRARY_TEXT }),
        (text) => {
          redact.text(text);
          redact.findings(text);
          return true;
        },
      ),
    );
  });

  it('never throws while redacting any JSON value', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        redact.object(value);
        return true;
      }),
    );
  });

  it('never repeats a configured value in configuration errors', () => {
    let message = '';
    try {
      createRedactor({ detect: [CURP as never] });
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidConfigurationError);
      message = (error as Error).message;
    }

    expect(message).toBe('detect lists an unknown identifier type');
    expect(message).not.toContain(CURP);
  });
});
