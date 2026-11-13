import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type NormalizedText,
  normalizeForDetection,
  toOriginalSpan,
} from '../../src/engine/normalize.js';

const ASCII_CHARACTER_COUNT = 128;
const INVISIBLE_CHARACTER = /^\p{Default_Ignorable_Code_Point}$/u;
const MIXED_TEXT_PIECES = 20;

function normalizeCharacterByCharacter(input: string): NormalizedText {
  const pieces: string[] = [];
  const originalIndexes: number[] = [];
  let originalIndex = 0;
  for (const character of input) {
    if (!INVISIBLE_CHARACTER.test(character)) {
      const piece = character.normalize('NFKC').toUpperCase();
      pieces.push(piece);
      originalIndexes.push(
        ...Array.from({ length: piece.length }, () => originalIndex),
      );
    }
    originalIndex += character.length;
  }
  originalIndexes.push(input.length);
  return { text: pieces.join(''), originalIndexes };
}

const mixedText = fc
  .array(
    fc.oneof(
      fc.string({ unit: 'grapheme-ascii' }),
      fc.string({ unit: 'binary' }),
      fc.constantFrom(
        '\u007F',
        '\u0080',
        '\u200B',
        '\u00AD',
        'ﬁ',
        '０',
        '\u00A0',
        'ñ',
        '😀',
      ),
    ),
    { maxLength: MIXED_TEXT_PIECES },
  )
  .map((pieces) => pieces.join(''));

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

describe('normalizeForDetection on ASCII', () => {
  const asciiCharacters = Array.from(
    { length: ASCII_CHARACTER_COUNT },
    (_, code) => String.fromCharCode(code),
  );

  it.each(
    asciiCharacters.map((character) => [character.charCodeAt(0), character]),
  )(
    'keeps ASCII code %i as one visible character, stable under NFKC',
    (_code, character) => {
      expect(INVISIBLE_CHARACTER.test(character)).toBe(false);
      expect(character.normalize('NFKC')).toBe(character);
      expect(character.toUpperCase()).toHaveLength(1);
    },
  );

  it('matches the character-by-character normalization on any text', () => {
    fc.assert(
      fc.property(mixedText, (input) => {
        expect(normalizeForDetection(input)).toEqual(
          normalizeCharacterByCharacter(input),
        );
      }),
    );
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

  it('refuses a span outside the normalized text', () => {
    const normalized = normalizeForDetection('ab');

    expect(() => toOriginalSpan(normalized, 0, 9)).toThrow(
      new RangeError('The span lies outside the normalized text'),
    );
  });
});
