import { checkSync } from 'recheck';
import { describe, expect, it } from 'vitest';
import { readYamlDocument } from './support/spec-files.ts';

const PATTERN_FLAGS = 'u';
const RECHECK_TIMEOUT_MILLISECONDS = 30_000;
const CATASTROPHIC_PATTERN = '^(a+)+$';

const identifiers = readYamlDocument('identifiers.yaml') as Record<
  string,
  { readonly pattern: string }
>;

describe('ReDoS check', () => {
  it(
    'reports a pattern with catastrophic backtracking as vulnerable',
    () => {
      expect(checkSync(CATASTROPHIC_PATTERN, PATTERN_FLAGS).status).toBe(
        'vulnerable',
      );
    },
    RECHECK_TIMEOUT_MILLISECONDS,
  );

  it.each(Object.entries(identifiers))(
    'finds the %s pattern safe',
    (_type, definition) => {
      expect(checkSync(definition.pattern, PATTERN_FLAGS).status).toBe('safe');
    },
    RECHECK_TIMEOUT_MILLISECONDS,
  );
});
