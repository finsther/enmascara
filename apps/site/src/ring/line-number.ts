const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';

function isLineBreakEnd(text: string, index: number): boolean {
  const character = text[index];
  if (character === LINE_FEED) {
    return true;
  }
  return character === CARRIAGE_RETURN && text[index + 1] !== LINE_FEED;
}

/**
 * Returns the line, counted from 1, where a position of the text falls.
 * Line feeds, carriage returns and both together each end one line.
 *
 * @param text - Text the position belongs to.
 * @param offset - Position in UTF-16 code units, as `findings()` reports it.
 * @returns The line number.
 * @example
 * ```ts
 * lineNumberAt('a\r\nb', 3); // 2
 * ```
 */
export function lineNumberAt(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (isLineBreakEnd(text, index)) {
      line += 1;
    }
  }
  return line;
}
