const ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;
const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
] as const;
const BLOCK_BYTES = 64;
const WORD_BYTES = 4;
const BLOCK_WORDS = 16;
const SCHEDULE_WORDS = 64;
const HASH_WORDS = 8;
const LENGTH_FIELD_BYTES = 8;
const PADDING_START_BYTE = 0x80;
const BITS_PER_BYTE = 8;
const TWO_TO_THE_32 = 2 ** 32;
const INNER_PAD_BYTE = 0x36;
const WORD_BITS = 32;
const SCHEDULE_FIFTEEN_BACK = 15;
const SCHEDULE_TWO_BACK = 2;
const SCHEDULE_SIXTEEN_BACK = 16;
const SCHEDULE_SEVEN_BACK = 7;
const SIGMA_ZERO_ROTATIONS = [7, 18] as const;
const SIGMA_ZERO_SHIFT = 3;
const SIGMA_ONE_ROTATIONS = [17, 19] as const;
const SIGMA_ONE_SHIFT = 10;
const SUM_ZERO_ROTATIONS = [2, 13, 22] as const;
const SUM_ONE_ROTATIONS = [6, 11, 25] as const;
const OUTER_PAD_BYTE = 0x5c;

function wordView(words: readonly number[]): DataView {
  const view = new DataView(new ArrayBuffer(words.length * WORD_BYTES));
  words.forEach((word, index) => {
    view.setUint32(index * WORD_BYTES, word);
  });
  return view;
}

const ROUND_CONSTANT_VIEW = wordView(ROUND_CONSTANTS);

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (WORD_BITS - bits));
}

function rotatedXor(value: number, rotations: readonly number[]): number {
  return rotations.reduce(
    (combined, bits) => combined ^ rotateRight(value, bits),
    0,
  );
}

function padded(message: Uint8Array): DataView {
  const length =
    Math.ceil((message.length + 1 + LENGTH_FIELD_BYTES) / BLOCK_BYTES) *
    BLOCK_BYTES;
  const bytes = new Uint8Array(length);
  bytes.set(message);
  bytes[message.length] = PADDING_START_BYTE;
  const view = new DataView(bytes.buffer);
  const bitLength = message.length * BITS_PER_BYTE;
  view.setUint32(
    length - LENGTH_FIELD_BYTES,
    Math.floor(bitLength / TWO_TO_THE_32),
  );
  view.setUint32(length - WORD_BYTES, bitLength >>> 0);
  return view;
}

function word(view: DataView, index: number): number {
  return view.getUint32(index * WORD_BYTES);
}

function fillSchedule(
  schedule: DataView,
  message: DataView,
  offset: number,
): void {
  for (let index = 0; index < BLOCK_WORDS; index += 1) {
    schedule.setUint32(
      index * WORD_BYTES,
      message.getUint32(offset + index * WORD_BYTES),
    );
  }
  for (let index = BLOCK_WORDS; index < SCHEDULE_WORDS; index += 1) {
    const fifteenBack = word(schedule, index - SCHEDULE_FIFTEEN_BACK);
    const twoBack = word(schedule, index - SCHEDULE_TWO_BACK);
    const sigmaZero =
      rotatedXor(fifteenBack, SIGMA_ZERO_ROTATIONS) ^
      (fifteenBack >>> SIGMA_ZERO_SHIFT);
    const sigmaOne =
      rotatedXor(twoBack, SIGMA_ONE_ROTATIONS) ^ (twoBack >>> SIGMA_ONE_SHIFT);
    schedule.setUint32(
      index * WORD_BYTES,
      (word(schedule, index - SCHEDULE_SIXTEEN_BACK) +
        sigmaZero +
        word(schedule, index - SCHEDULE_SEVEN_BACK) +
        sigmaOne) >>>
        0,
    );
  }
}

function compress(hash: DataView, schedule: DataView): void {
  let a = word(hash, 0);
  let b = word(hash, 1);
  let c = word(hash, 2);
  let d = word(hash, 3);
  let e = word(hash, 4);
  let f = word(hash, 5);
  let g = word(hash, 6);
  let h = word(hash, 7);
  for (let index = 0; index < SCHEDULE_WORDS; index += 1) {
    const sumOne = rotatedXor(e, SUM_ONE_ROTATIONS);
    const choice = (e & f) ^ (~e & g);
    const first =
      (h +
        sumOne +
        choice +
        word(ROUND_CONSTANT_VIEW, index) +
        word(schedule, index)) >>>
      0;
    const sumZero = rotatedXor(a, SUM_ZERO_ROTATIONS);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const second = (sumZero + majority) >>> 0;
    h = g;
    g = f;
    f = e;
    e = (d + first) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (first + second) >>> 0;
  }
  [a, b, c, d, e, f, g, h].forEach((value, index) => {
    hash.setUint32(index * WORD_BYTES, (word(hash, index) + value) >>> 0);
  });
}

export function sha256(message: Uint8Array): Uint8Array {
  const hash = wordView(INITIAL_HASH);
  const schedule = new DataView(new ArrayBuffer(SCHEDULE_WORDS * WORD_BYTES));
  const blocks = padded(message);
  for (let offset = 0; offset < blocks.byteLength; offset += BLOCK_BYTES) {
    fillSchedule(schedule, blocks, offset);
    compress(hash, schedule);
  }
  return new Uint8Array(hash.buffer, 0, HASH_WORDS * WORD_BYTES);
}

function concatenated(first: Uint8Array, second: Uint8Array): Uint8Array {
  const joined = new Uint8Array(first.length + second.length);
  joined.set(first);
  joined.set(second, first.length);
  return joined;
}

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const keyBlock = new Uint8Array(BLOCK_BYTES);
  keyBlock.set(key.length > BLOCK_BYTES ? sha256(key) : key);
  const inner = sha256(
    concatenated(
      keyBlock.map((byte) => byte ^ INNER_PAD_BYTE),
      message,
    ),
  );
  return sha256(
    concatenated(
      keyBlock.map((byte) => byte ^ OUTER_PAD_BYTE),
      inner,
    ),
  );
}
