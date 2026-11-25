import { describe, expect, it } from 'vitest';
import {
  inputSizeLabel,
  maskedCountLabel,
  maskedDataLabel,
  RING_STRATEGIES,
  settingsSummary,
  strategyLabel,
} from '../../src/ring/ring-copy.ts';

describe('RING_STRATEGIES', () => {
  it('lists the strategies in the order of the design', () => {
    expect(RING_STRATEGIES).toEqual(['halfMask', 'fullMask', 'incognito']);
  });
});

describe('strategyLabel', () => {
  it('names each strategy as the design does', () => {
    expect(RING_STRATEGIES.map(strategyLabel)).toEqual([
      'Media máscara',
      'Máscara completa',
      'Incógnito',
    ]);
  });
});

describe('inputSizeLabel', () => {
  it('counts characters in singular and plural', () => {
    expect(inputSizeLabel(0)).toBe('0 caracteres');
    expect(inputSizeLabel(1)).toBe('1 carácter');
    expect(inputSizeLabel(2)).toBe('2 caracteres');
  });

  it('groups thousands as in Mexico', () => {
    expect(inputSizeLabel(12_345)).toBe('12,345 caracteres');
  });
});

describe('maskedCountLabel', () => {
  it('counts masked identifiers in singular and plural', () => {
    expect(maskedCountLabel(0)).toBe('0 enmascarados');
    expect(maskedCountLabel(1)).toBe('1 enmascarado');
    expect(maskedCountLabel(7)).toBe('7 enmascarados');
  });
});

describe('maskedDataLabel', () => {
  it('counts masked data in singular and plural', () => {
    expect(maskedDataLabel(0)).toBe('0 datos enmascarados');
    expect(maskedDataLabel(1)).toBe('1 dato enmascarado');
    expect(maskedDataLabel(3)).toBe('3 datos enmascarados');
  });
});

describe('settingsSummary', () => {
  it('names the strategy and the selected types', () => {
    expect(
      settingsSummary({
        detect: ['clabe', 'curp', 'rfc', 'card'],
        strategy: 'halfMask',
      }),
    ).toBe('Media máscara · CLABE, CURP, RFC, Tarjeta');
  });

  it('lists the types in the order of the ring', () => {
    expect(
      settingsSummary({ detect: ['card', 'clabe'], strategy: 'incognito' }),
    ).toBe('Incógnito · CLABE, Tarjeta');
  });
});
