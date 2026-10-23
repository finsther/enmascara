const MULBERRY32_INCREMENT = 0x6d2b79f5;
const UNSIGNED_32_BIT_RANGE = 2 ** 32;

export interface Random {
  integer(minimum: number, maximum: number): number;
  characters(alphabet: string, length: number): string;
  pick<Item>(items: readonly Item[]): Item;
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY32_INCREMENT) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UNSIGNED_32_BIT_RANGE;
  };
}

export function createRandom(seed: number): Random {
  const nextFraction = createMulberry32(seed);
  const integer = (minimum: number, maximum: number): number =>
    minimum + Math.floor(nextFraction() * (maximum - minimum + 1));
  const pick = <Item>(items: readonly Item[]): Item => {
    const item = items[integer(0, items.length - 1)];
    if (item === undefined) {
      throw new RangeError('Cannot pick from an empty list');
    }
    return item;
  };
  return {
    integer,
    pick,
    characters: (alphabet, length) =>
      Array.from({ length }, () => pick([...alphabet])).join(''),
  };
}
