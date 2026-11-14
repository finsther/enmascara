import type { Engine } from './engine.js';
import { redactText } from './redact-text.js';

const CIRCULAR_REFERENCE_MASK = '[Circular]';
const MAXIMUM_DEPTH_MASK = '[MaxDepth]';
const UNREADABLE_OBJECT_MASK = '[REDACTED]';
const DEFAULT_ERROR_NAME = 'Error';
const ERROR_NAME_KEY = 'name';
const ERROR_STACK_KEY = 'stack';
const ERROR_TEXT_KEYS = ['message', ERROR_STACK_KEY] as const;
const ENGINE_STACK_GETTER = Object.getOwnPropertyDescriptor(
  new Error(),
  ERROR_STACK_KEY,
)?.get;

type Store = (value: unknown) => void;

type OwnValue = { readonly value: unknown } | undefined;

type ReadOwnValue = (source: object, key: string) => OwnValue;

interface CopyTask {
  readonly kind: 'copy';
  readonly source: unknown;
  readonly depth: number;
  readonly store: Store;
}

interface LeaveTask {
  readonly kind: 'leave';
  readonly source: object;
}

type Task = CopyTask | LeaveTask;

interface ChildValue {
  readonly source: unknown;
  readonly store: Store;
}

interface ShallowCopy {
  readonly container: object;
  readonly children: readonly ChildValue[];
}

function redactPrimitive(value: unknown, engine: Engine): unknown {
  if (typeof value === 'string') {
    return redactText(value, engine);
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    const digits = String(value);
    const redacted = redactText(digits, engine);
    return redacted === digits ? value : redacted;
  }
  return value;
}

function ownDataValue(source: object, key: string): OwnValue {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (
    descriptor === undefined ||
    !('value' in descriptor) ||
    typeof descriptor.value === 'function'
  ) {
    return undefined;
  }
  return { value: descriptor.value };
}

function engineStackValue(source: object, key: string): OwnValue {
  if (key !== ERROR_STACK_KEY || ENGINE_STACK_GETTER === undefined) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  return descriptor?.get === ENGINE_STACK_GETTER
    ? { value: ENGINE_STACK_GETTER.call(source) }
    : undefined;
}

function ownErrorValue(source: object, key: string): OwnValue {
  return ownDataValue(source, key) ?? engineStackValue(source, key);
}

function errorName(error: Error): string {
  for (
    let prototype: object | null = error;
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const name = ownDataValue(prototype, ERROR_NAME_KEY);
    if (name !== undefined) {
      return String(name.value);
    }
  }
  return DEFAULT_ERROR_NAME;
}

function copyArray(source: readonly unknown[]): ShallowCopy {
  const container: unknown[] = Array.from({ length: source.length });
  const children = container.flatMap((_unset, index) => {
    const data = ownDataValue(source, String(index));
    return data === undefined
      ? []
      : [
          {
            source: data.value,
            store: (value: unknown) => {
              container[index] = value;
            },
          },
        ];
  });
  return { container, children };
}

function copyProperties(
  source: object,
  keys: readonly string[],
  container: Record<string, unknown>,
  engine: Engine,
  readOwnValue: ReadOwnValue,
): readonly ChildValue[] {
  return keys.flatMap((key) => {
    const data = readOwnValue(source, key);
    if (data === undefined) {
      return [];
    }
    const maskedKey = redactText(key, engine);
    return [
      {
        source: data.value,
        store: (value: unknown) => {
          container[maskedKey] = value;
        },
      },
    ];
  });
}

function copyObject(source: object, engine: Engine): ShallowCopy {
  if (Array.isArray(source)) {
    return copyArray(source);
  }
  const container: Record<string, unknown> = Object.create(null);
  if (source instanceof Error) {
    container[ERROR_NAME_KEY] = redactText(errorName(source), engine);
    const keys = [...new Set([...ERROR_TEXT_KEYS, ...Object.keys(source)])];
    return {
      container,
      children: copyProperties(source, keys, container, engine, ownErrorValue),
    };
  }
  return {
    container,
    children: copyProperties(
      source,
      Object.keys(source),
      container,
      engine,
      ownDataValue,
    ),
  };
}

export function redactObject(value: unknown, engine: Engine): unknown {
  let result: unknown;
  const path = new Set<object>();
  const tasks: Task[] = [
    {
      kind: 'copy',
      source: value,
      depth: 0,
      store: (copy) => {
        result = copy;
      },
    },
  ];
  for (let task = tasks.pop(); task !== undefined; task = tasks.pop()) {
    if (task.kind === 'leave') {
      path.delete(task.source);
      continue;
    }
    const { source, depth, store } = task;
    if (typeof source !== 'object' || source === null) {
      store(redactPrimitive(source, engine));
    } else if (path.has(source)) {
      store(CIRCULAR_REFERENCE_MASK);
    } else if (depth >= engine.maxDepth) {
      store(MAXIMUM_DEPTH_MASK);
    } else {
      try {
        const { container, children } = copyObject(source, engine);
        store(container);
        path.add(source);
        tasks.push({ kind: 'leave', source });
        for (const child of children) {
          tasks.push({ kind: 'copy', depth: depth + 1, ...child });
        }
      } catch {
        store(UNREADABLE_OBJECT_MASK);
      }
    }
  }
  return result;
}
