import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/engine/detect.js';
import { redactStrategy } from '../../src/strategies/redact-strategy.js';

function finding(type: string): Finding {
  return { type, start: 0, end: 18, confidence: 'high' };
}

describe('redactStrategy', () => {
  it.each([
    ['clabe', '[CLABE]'],
    ['curp', '[CURP]'],
    ['rfc', '[RFC]'],
    ['card', '[CARD]'],
  ])('masks a %s as %s', (type, mask) => {
    expect(redactStrategy.mask(finding(type), '002180032240946700')).toBe(mask);
  });

  it('never keeps any part of the value', () => {
    const value = 'GODE561231HDFRRN00';

    expect(redactStrategy.mask(finding('curp'), value)).not.toMatch(/[0-9]/);
  });
});
