import { InvalidConfigurationError } from '../errors.js';

const CANDIDATE_PATTERN_FLAGS = 'gu';

export interface PatternDefinition {
  readonly pattern: string;
}

export interface CandidatePattern {
  readonly type: string;
  readonly pattern: RegExp;
}

export function compileCandidatePatterns(
  definitions: Readonly<Record<string, PatternDefinition>>,
  types: readonly string[],
): readonly CandidatePattern[] {
  return types.map((type) => {
    const definition = definitions[type];
    if (definition === undefined) {
      throw new InvalidConfigurationError(`Unknown identifier type: ${type}`);
    }
    return {
      type,
      pattern: new RegExp(definition.pattern, CANDIDATE_PATTERN_FLAGS),
    };
  });
}
