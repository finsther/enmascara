export function uniqueValues<Value>(
  count: number,
  produce: () => Value,
  keyOf: (value: Value) => string,
): readonly Value[] {
  const valuesByKey = new Map<string, Value>();
  while (valuesByKey.size < count) {
    const value = produce();
    valuesByKey.set(keyOf(value), value);
  }
  return [...valuesByKey.values()];
}
