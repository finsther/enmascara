const INVISIBLE_CHARACTER = /^\p{Default_Ignorable_Code_Point}$/u;

export interface NormalizedText {
  readonly text: string;
  readonly originalIndexes: readonly number[];
}

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

const ASCII_LIMIT = 0x80;

function asciiRunEnd(input: string, start: number): number {
  let end = start;
  while (end < input.length && input.charCodeAt(end) < ASCII_LIMIT) {
    end += 1;
  }
  return end;
}

function characterAt(input: string, index: number): string {
  return String.fromCodePoint(input.codePointAt(index) ?? 0);
}

function pushRepeated(
  target: number[],
  value: number,
  repetitions: number,
): void {
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    target.push(value);
  }
}

function pushRange(target: number[], start: number, end: number): void {
  for (let index = start; index < end; index += 1) {
    target.push(index);
  }
}

export function normalizeForDetection(input: string): NormalizedText {
  const pieces: string[] = [];
  const originalIndexes: number[] = [];
  let index = 0;
  while (index < input.length) {
    const runEnd = asciiRunEnd(input, index);
    if (runEnd > index) {
      pieces.push(input.slice(index, runEnd).toUpperCase());
      pushRange(originalIndexes, index, runEnd);
      index = runEnd;
    } else {
      const character = characterAt(input, index);
      if (!INVISIBLE_CHARACTER.test(character)) {
        const piece = character.normalize('NFKC').toUpperCase();
        pieces.push(piece);
        pushRepeated(originalIndexes, index, piece.length);
      }
      index += character.length;
    }
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
