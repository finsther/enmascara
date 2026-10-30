import { describe, expect, it } from 'vitest';
import {
  normalizeForDetection,
  toOriginalSpan,
} from '../../src/engine/normalize.js';

describe('normalizeForDetection', () => {
  it('upper-cases text and keeps each position', () => {
    const normalized = normalizeForDetection('rfc=gode');

    expect(normalized.text).toBe('RFC=GODE');
    expect(normalized.originalIndexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('turns full-width digits into ASCII digits', () => {
    expect(normalizeForDetection('０２').text).toBe('02');
  });

  it('turns no-break spaces into spaces', () => {
    expect(normalizeForDetection('4242 4242').text).toBe('4242 4242');
  });

  it.each([
    ['​', 'zero-width space'],
    ['­', 'soft hyphen'],
    ['﻿', 'byte order mark'],
    ['‍', 'zero-width joiner'],
    ['⁦', 'left-to-right isolate'],
  ])('removes %j (%s) and maps around it', (invisible) => {
    const normalized = normalizeForDetection(`AB${invisible}CD`);

    expect(normalized.text).toBe('ABCD');
    expect(normalized.originalIndexes).toEqual([0, 1, 3, 4, 5]);
  });

  it('maps every unit of an expanded character to its origin', () => {
    const normalized = normalizeForDetection('ﬁx');

    expect(normalized.text).toBe('FIX');
    expect(normalized.originalIndexes).toEqual([0, 0, 1, 2]);
  });

  it('keeps characters outside the basic plane intact', () => {
    const normalized = normalizeForDetection('😀1');

    expect(normalized.text).toBe('😀1');
    expect(normalized.originalIndexes).toEqual([0, 0, 2, 3]);
  });

  it('normalizes empty text', () => {
    expect(normalizeForDetection('')).toEqual({
      text: '',
      originalIndexes: [0],
    });
  });
});

describe('toOriginalSpan', () => {
  it('covers the invisible characters inside a span', () => {
    const normalized = normalizeForDetection('x=AB​CD;');

    expect(toOriginalSpan(normalized, 2, 6)).toEqual({ start: 2, end: 7 });
  });

  it('maps a span that ends with the text', () => {
    const normalized = normalizeForDetection('ab​');

    expect(toOriginalSpan(normalized, 0, 2)).toEqual({ start: 0, end: 3 });
  });
});
