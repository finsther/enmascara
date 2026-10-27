import type { Rejection } from '../rules/rejection.ts';
import { uniqueValues } from './unique.ts';

export interface InvalidValue {
  readonly value: string;
  readonly reason: Rejection;
}

export interface GeneratedValues {
  readonly valid: readonly string[];
  readonly invalid: readonly InvalidValue[];
}

export type InvalidValueProducer = readonly [Rejection, () => string];

export const MINIMUM_FIXTURES_PER_GROUP = 30;

export function validValuesFrom(produce: () => string): readonly string[] {
  return uniqueValues(MINIMUM_FIXTURES_PER_GROUP, produce, String);
}

export function invalidValuesFrom(
  producers: readonly InvalidValueProducer[],
): readonly InvalidValue[] {
  const valuesPerReason = MINIMUM_FIXTURES_PER_GROUP / producers.length;
  return producers.flatMap(([reason, produce]) =>
    uniqueValues(
      valuesPerReason,
      () => ({ value: produce(), reason }),
      (fixture) => fixture.value,
    ),
  );
}
