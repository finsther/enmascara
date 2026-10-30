const INVISIBLE_CHARACTER = /^\p{Default_Ignorable_Code_Point}$/u;

export interface NormalizedText {
  readonly text: string;
  readonly originalIndexes: readonly number[];
}

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

export function normalizeForDetection(input: string): NormalizedText {
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

function originalIndexAt(normalized: NormalizedText, index: number): number {
  const originalIndex = normalized.originalIndexes[index];
  if (originalIndex === undefined) {
    throw new RangeError('The span lies outside the normalized text');
  }
  return originalIndex;
}

export function toOriginalSpan(
  normalized: NormalizedText,
  start: number,
  end: number,
): TextSpan {
  return {
    start: originalIndexAt(normalized, start),
    end: originalIndexAt(normalized, end),
  };
}
