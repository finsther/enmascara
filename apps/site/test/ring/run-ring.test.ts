import { createRedactor } from 'enmascara';
import { describe, expect, it } from 'vitest';
import {
  DEMO_HMAC_KEY,
  type RingOptions,
} from '../../src/ring/ring-options.ts';
import { runRing } from '../../src/ring/run-ring.ts';

const CLABE = '002180032240946700';
const CARD = '4242424242424242';
const CURP = 'BNQF380215XSRHNDD6';
const RFC = 'GODE561231GR8';
const ALL_TYPES: RingOptions['detect'] = ['clabe', 'curp', 'rfc', 'card'];

describe('runRing', () => {
  it('masks every selected type with the full mask', () => {
    const result = runRing(`SPEI a ${CLABE} con ${CARD}`, {
      detect: ALL_TYPES,
      strategy: 'fullMask',
    });

    expect(result.output).toBe('SPEI a [CLABE] con [CARD]');
  });

  it('keeps the last characters with the half mask', () => {
    const result = runRing(`tarjeta ${CARD}`, {
      detect: ALL_TYPES,
      strategy: 'halfMask',
    });

    expect(result.output).toBe('tarjeta ************4242');
  });

  it('writes the same tags as the package with the demo key in incognito', () => {
    const input = `CURP ${CURP} y RFC ${RFC}`;
    const expected = createRedactor({
      strategy: 'hmac',
      hmacKey: DEMO_HMAC_KEY,
    }).text(input);

    const result = runRing(input, { detect: ALL_TYPES, strategy: 'incognito' });

    expect(result.output).toBe(expected);
    expect(result.output).not.toContain(CURP);
  });

  it('leaves the types that are not selected', () => {
    const result = runRing(`${CLABE} ${CARD}`, {
      detect: ['clabe'],
      strategy: 'fullMask',
    });

    expect(result.output).toBe(`[CLABE] ${CARD}`);
  });

  it('lists each finding with its type, line and masked result', () => {
    const input = `inicio\r\nSPEI a ${CLABE}\n\ntarjeta ${CARD}`;

    const result = runRing(input, { detect: ALL_TYPES, strategy: 'halfMask' });

    expect(result.rows).toEqual([
      { type: 'clabe', line: 2, result: '**************6700' },
      { type: 'card', line: 4, result: '************4242' },
    ]);
  });

  it('never puts a detected value in the rows', () => {
    const values = [CLABE, CARD, CURP, RFC];

    const result = runRing(values.join('\n'), {
      detect: ALL_TYPES,
      strategy: 'halfMask',
    });

    expect(result.rows).toHaveLength(values.length);
    const serializedRows = JSON.stringify(result.rows);
    for (const value of values) {
      expect(serializedRows).not.toContain(value);
    }
  });

  it('returns no rows when nothing is detected', () => {
    const result = runRing('sin datos sensibles', {
      detect: ALL_TYPES,
      strategy: 'fullMask',
    });

    expect(result).toEqual({ output: 'sin datos sensibles', rows: [] });
  });

  it('masks everything and lists nothing when the redactor fails', () => {
    const impossibleOptions = {
      detect: [],
      strategy: 'fullMask',
    } as unknown as RingOptions;

    const result = runRing(`SPEI a ${CLABE}`, impossibleOptions);

    expect(result).toEqual({ output: '[REDACTED]', rows: [] });
  });
});
