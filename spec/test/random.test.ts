import { describe, expect, it } from 'vitest';
import { createRandom } from '../tools/generator/random.js';

const SEED = 42;
const DRAWS = 1000;

function drawIntegers(minimum: number, maximum: number): readonly number[] {
  const random = createRandom(SEED);
  return Array.from({ length: DRAWS }, () => random.integer(minimum, maximum));
}

describe('createRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRandom(SEED);
    const second = createRandom(SEED);

    expect(Array.from({ length: 5 }, () => first.integer(0, 9))).toEqual(
      Array.from({ length: 5 }, () => second.integer(0, 9)),
    );
  });

  it('draws integers between both bounds, reaching each bound', () => {
    const draws = drawIntegers(3, 7);

    expect(Math.min(...draws)).toBe(3);
    expect(Math.max(...draws)).toBe(7);
    expect(draws.every(Number.isInteger)).toBe(true);
  });

  it('builds text of the requested length from the given alphabet', () => {
    const text = createRandom(SEED).characters('AB', 50);

    expect(text).toMatch(/^[AB]{50}$/);
    expect(new Set(text).size).toBe(2);
  });

  it('picks every item of a list eventually', () => {
    const random = createRandom(SEED);
    const items = ['first', 'second', 'third'];

    const picked = new Set(
      Array.from({ length: 100 }, () => random.pick(items)),
    );

    expect(picked).toEqual(new Set(items));
  });

  it('refuses to pick from an empty list', () => {
    expect(() => createRandom(SEED).pick([])).toThrow(RangeError);
  });
});
