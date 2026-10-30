import { describe, expect, it } from 'vitest';
import { detect, type TypeDetector } from '../../src/engine/detect.js';
import { normalizeForDetection } from '../../src/engine/normalize.js';

function detector(
  type: string,
  pattern: RegExp,
  isValid: (candidate: string) => boolean,
): TypeDetector {
  return { type, confidence: 'high', pattern, validator: { isValid } };
}

const FOUR_DIGITS = detector('code', /[0-9]{4}/gu, () => true);

describe('detect', () => {
  it('reports each valid candidate as a frozen finding without its value', () => {
    const [finding] = detect(normalizeForDetection('id 1234'), [FOUR_DIGITS]);

    expect(finding).toEqual({
      type: 'code',
      start: 3,
      end: 7,
      confidence: 'high',
    });
    expect(Object.isFrozen(finding)).toBe(true);
  });

  it('skips candidates the validator rejects', () => {
    const rejectsAll = detector('code', /[0-9]{4}/gu, () => false);

    expect(detect(normalizeForDetection('id 1234'), [rejectsAll])).toEqual([]);
  });

  it('looks again from the next position after a rejected candidate', () => {
    const onlyTwoThreeFourFive = detector(
      'code',
      /[0-9]{4}/gu,
      (candidate) => candidate === '2345',
    );

    const findings = detect(normalizeForDetection('12345'), [
      onlyTwoThreeFourFive,
    ]);

    expect(findings.map(({ start, end }) => [start, end])).toEqual([[1, 5]]);
  });

  it('reports a candidate whose validator throws, failing closed', () => {
    const throwing = detector('code', /[0-9]{4}/gu, () => {
      throw new Error('validator failure');
    });

    expect(detect(normalizeForDetection('1234'), [throwing])).toHaveLength(1);
  });

  it('maps findings to the original text, invisible characters included', () => {
    const [finding] = detect(normalizeForDetection('x 12​34;'), [FOUR_DIGITS]);

    expect(finding).toMatchObject({ start: 2, end: 7 });
  });

  it('keeps the earliest finding when types overlap', () => {
    const sixDigits = detector('long', /[0-9]{6}/gu, () => true);

    const findings = detect(normalizeForDetection('a 123456 b 9876'), [
      FOUR_DIGITS,
      sixDigits,
    ]);

    expect(findings.map(({ type, start }) => [type, start])).toEqual([
      ['long', 2],
      ['code', 11],
    ]);
  });

  it('keeps the longest finding when two start together', () => {
    const sixDigits = detector('long', /[0-9]{6}/gu, () => true);

    const findings = detect(normalizeForDetection('123456'), [
      FOUR_DIGITS,
      sixDigits,
    ]);

    expect(findings.map(({ type }) => type)).toEqual(['long']);
  });
});
