import { describe, expect, it } from 'vitest';
import { lineNumberAt } from '../../src/ring/line-number.ts';

describe('lineNumberAt', () => {
  it('starts counting at line 1', () => {
    expect(lineNumberAt('abc', 0)).toBe(1);
    expect(lineNumberAt('abc', 2)).toBe(1);
  });

  it('counts line feeds before the offset', () => {
    expect(lineNumberAt('a\nb\nc', 2)).toBe(2);
    expect(lineNumberAt('a\nb\nc', 4)).toBe(3);
  });

  it('keeps the line feed itself on its line', () => {
    expect(lineNumberAt('a\nb', 1)).toBe(1);
  });

  it('counts a carriage return and line feed pair as one break', () => {
    expect(lineNumberAt('a\r\nb\r\nc', 3)).toBe(2);
    expect(lineNumberAt('a\r\nb\r\nc', 6)).toBe(3);
  });

  it('counts a lone carriage return as a break', () => {
    expect(lineNumberAt('a\rb\rc', 4)).toBe(3);
  });

  it('counts empty lines', () => {
    expect(lineNumberAt('\n\n\nx', 3)).toBe(4);
  });
});
