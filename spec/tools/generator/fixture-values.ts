import type { Rejection } from '../rules/rejection.ts';

export interface InvalidValue {
  readonly value: string;
  readonly reason: Rejection;
}

export interface GeneratedValues {
  readonly valid: readonly string[];
  readonly invalid: readonly InvalidValue[];
}

export const MINIMUM_FIXTURES_PER_GROUP = 30;
export const FIXTURES_PER_REJECTION = MINIMUM_FIXTURES_PER_GROUP / 2;
