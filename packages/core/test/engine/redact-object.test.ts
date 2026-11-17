import { describe, expect, it } from 'vitest';
import { createEngine, type EngineOptions } from '../../src/engine/engine.js';
import { redactObject } from '../../src/engine/redact-object.js';
import { redactStrategy } from '../../src/strategies/redact-strategy.js';

const CURP = 'GODE561231HDFRRN00';
const CARD = '4242424242424242';

function engineWith(overrides: Partial<EngineOptions> = {}) {
  return createEngine({
    types: ['clabe', 'curp', 'rfc', 'card'],
    maxInputLength: 1_000_000,
    maxDepth: 32,
    strategyFor: () => redactStrategy,
    ...overrides,
  });
}

interface Chain {
  child?: Chain;
}

function nestedChain(levels: number): Chain {
  const root: Chain = {};
  let current = root;
  for (let level = 0; level < levels; level += 1) {
    const child: Chain = {};
    current.child = child;
    current = child;
  }
  return root;
}

function property(value: unknown, key: string): unknown {
  return (value as Record<string, unknown>)[key];
}

describe('redactObject', () => {
  const engine = engineWith();

  it('masks strings anywhere in objects and arrays', () => {
    const result = redactObject(
      { user: { curp: CURP }, cards: [CARD, 'ok'] },
      engine,
    );

    expect(JSON.parse(JSON.stringify(result))).toEqual({
      user: { curp: '[CURP]' },
      cards: ['[CARD]', 'ok'],
    });
  });

  it('returns a copy and leaves the original untouched', () => {
    const original = { user: { curp: CURP } };

    const result = redactObject(original, engine);

    expect(result).not.toBe(original);
    expect(original).toEqual({ user: { curp: CURP } });
  });

  it('builds objects without a prototype', () => {
    const result = redactObject({ nested: {} }, engine);

    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(Object.getPrototypeOf(property(result, 'nested'))).toBeNull();
  });

  it('copies a __proto__ key as data without polluting any prototype', () => {
    const parsed: unknown = JSON.parse(`{"__proto__":{"polluted":"${CURP}"}}`);

    const protoKey = '__proto__';

    const result = redactObject(parsed, engine);

    expect(Object.keys(result as object)).toEqual([protoKey]);
    expect(JSON.parse(JSON.stringify(property(result, protoKey)))).toEqual({
      polluted: '[CURP]',
    });
    expect(property({}, 'polluted')).toBeUndefined();
  });

  it('skips accessors without running them', () => {
    const source = {
      plain: 'ok',
      get secret(): string {
        throw new Error('the getter ran');
      },
    };

    const result = redactObject(source, engine);

    expect(Object.keys(result as object)).toEqual(['plain']);
  });

  it('copies own properties only', () => {
    const source: { own?: string } = Object.create({ inherited: CURP });
    source.own = 'ok';

    expect(Object.keys(redactObject(source, engine) as object)).toEqual([
      'own',
    ]);
  });

  it('replaces a reference back to an ancestor with [Circular]', () => {
    const source: { name: string; self?: unknown } = { name: 'loop' };
    source.self = source;

    const result = redactObject(source, engine);

    expect(property(result, 'self')).toBe('[Circular]');
  });

  it('copies an object shared by two branches twice instead of calling it circular', () => {
    const shared = { curp: CURP };

    const result = redactObject({ first: shared, second: shared }, engine);

    expect(JSON.parse(JSON.stringify(result))).toEqual({
      first: { curp: '[CURP]' },
      second: { curp: '[CURP]' },
    });
  });

  it('replaces objects nested past the maximum depth with [MaxDepth]', () => {
    const result = redactObject(nestedChain(3), engineWith({ maxDepth: 2 }));

    expect(JSON.parse(JSON.stringify(result))).toEqual({
      child: { child: '[MaxDepth]' },
    });
  });

  it('walks very deep objects without overflowing the stack', () => {
    const levels = 200_000;

    expect(() =>
      redactObject(nestedChain(levels), engineWith({ maxDepth: levels + 1 })),
    ).not.toThrow();
  });

  it('masks keys that hold identifiers', () => {
    const result = redactObject({ [CURP]: 1 }, engine);

    expect(Object.keys(result as object)).toEqual(['[CURP]']);
  });

  it('replaces numbers and big integers that hold identifiers', () => {
    const result = redactObject(
      { pan: 4242424242424242, big: 4242424242424242n, count: 42 },
      engine,
    );

    expect({ ...(result as object) }).toEqual({
      pan: '[CARD]',
      big: '[CARD]',
      count: 42,
    });
  });

  it('copies an error as its name, message and stack, masked', () => {
    const error = new TypeError(`bad curp ${CURP}`);

    const copy = property(redactObject({ error }, engine), 'error');

    expect(property(copy, 'name')).toBe('TypeError');
    expect(property(copy, 'message')).toBe('bad curp [CURP]');
    expect(property(copy, 'stack')).toMatch(/^TypeError: bad curp \[CURP\]\n/);
    expect(String(property(copy, 'stack'))).not.toContain(CURP);
  });

  it('masks a stack the application reassigned', () => {
    const error = new Error('fallo');
    error.stack = `Error: curp ${CURP}\n    at pago`;

    const copy = property(redactObject({ error }, engine), 'error');

    expect(property(copy, 'stack')).toBe('Error: curp [CURP]\n    at pago');
  });

  it('skips a stack getter defined by the application without running it', () => {
    const error = new Error('fallo');
    Object.defineProperty(error, 'stack', {
      get(): string {
        throw new Error('the getter ran');
      },
    });

    const copy = property(redactObject({ error }, engine), 'error');

    expect(copy).toEqual({ name: 'Error', message: 'fallo' });
  });

  it('reads the stack getter of the engine only for the stack', () => {
    const error = new Error('fallo');
    const stackDescriptor = Object.getOwnPropertyDescriptor(error, 'stack');
    Object.defineProperty(error, 'origen', {
      ...stackDescriptor,
      enumerable: true,
    });

    const copy = property(redactObject({ error }, engine), 'error');

    expect(Object.keys(copy as object)).not.toContain('origen');
  });

  it('masks an error whose stack fails to format, failing closed', () => {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = () => {
      throw new Error(`format failed ${CURP}`);
    };
    try {
      const error = new Error(`curp ${CURP}`);

      const result = redactObject({ error }, engine);

      expect(result).toEqual({ error: '[REDACTED]' });
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  });

  it('drops functions', () => {
    const result = redactObject({ run: () => CURP, ok: true }, engine);

    expect(Object.keys(result as object)).toEqual(['ok']);
  });

  it('masks an object whose properties cannot be read, failing closed', () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error('trap');
        },
      },
    );

    const result = redactObject({ hostile }, engine);

    expect(property(result, 'hostile')).toBe('[REDACTED]');
  });

  it('handles primitive roots', () => {
    expect(redactObject(CURP, engine)).toBe('[CURP]');
    expect(redactObject(null, engine)).toBeNull();
    expect(redactObject(undefined, engine)).toBeUndefined();
  });
});
