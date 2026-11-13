const INVISIBLE_CHARACTER = /\p{Default_Ignorable_Code_Point}/u;

export interface NormalizedText {
  readonly text: string;
  readonly originalIndexes: readonly number[];
}

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

const ASCII_LIMIT = 0x80;

type CodeUnitTest = (codeUnit: number) => boolean;

const isAscii: CodeUnitTest = (codeUnit) => codeUnit < ASCII_LIMIT;
const isOutsideAscii: CodeUnitTest = (codeUnit) => codeUnit >= ASCII_LIMIT;

interface NormalizationTarget {
  readonly pieces: string[];
  readonly originalIndexes: number[];
}

function runEnd(input: string, start: number, belongs: CodeUnitTest): number {
  let end = start;
  while (end < input.length && belongs(input.charCodeAt(end))) {
    end += 1;
  }
  return end;
}

function appendAsciiRun(
  target: NormalizationTarget,
  run: string,
  start: number,
): void {
  target.pieces.push(run.toUpperCase());
  for (let offset = 0; offset < run.length; offset += 1) {
    target.originalIndexes.push(start + offset);
  }
}

function appendCharacters(
  target: NormalizationTarget,
  run: string,
  start: number,
): void {
  let originalIndex = start;
  for (const character of run) {
    if (!INVISIBLE_CHARACTER.test(character)) {
      const piece = character.normalize('NFKC').toUpperCase();
      target.pieces.push(piece);
      for (let unit = 0; unit < piece.length; unit += 1) {
        target.originalIndexes.push(originalIndex);
      }
    }
    originalIndex += character.length;
  }
}

export function normalizeForDetection(input: string): NormalizedText {
  const target: NormalizationTarget = { pieces: [], originalIndexes: [] };
  let index = 0;
  while (index < input.length) {
    const asciiEnd = runEnd(input, index, isAscii);
    appendAsciiRun(target, input.slice(index, asciiEnd), index);
    const otherEnd = runEnd(input, asciiEnd, isOutsideAscii);
    appendCharacters(target, input.slice(asciiEnd, otherEnd), asciiEnd);
    index = otherEnd;
  }
  target.originalIndexes.push(input.length);
  return {
    text: target.pieces.join(''),
    originalIndexes: target.originalIndexes,
  };
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
