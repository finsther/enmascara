import { describe, expect, it } from 'vitest';
import { compileCandidatePatterns } from '../../src/engine/candidates.js';

const DEFINITIONS = {
  clabe: { pattern: '(?<![0-9])[0-9]{18}(?![0-9])' },
  curp: { pattern: '[A-Z]{4}' },
};

describe('compileCandidatePatterns', () => {
  it('compiles one global Unicode pattern per requested type, in order', () => {
    const patterns = compileCandidatePatterns(DEFINITIONS, ['curp', 'clabe']);

    expect(patterns.map((candidate) => candidate.type)).toEqual([
      'curp',
      'clabe',
    ]);
    expect(patterns.map((candidate) => candidate.pattern.flags)).toEqual([
      'gu',
      'gu',
    ]);
  });

  it('compiles the pattern text of the definition', () => {
    const [clabe] = compileCandidatePatterns(DEFINITIONS, ['clabe']);

    expect(clabe?.pattern.source).toBe(DEFINITIONS.clabe.pattern);
  });
});
