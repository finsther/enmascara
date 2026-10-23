import { describe, expect, it } from 'vitest';
import {
  formatCurpReport,
  reportCurpCheck,
} from '../../tools/verification/curp-report.ts';
import { readCatalogs, readPattern } from '../support/fixture-problems.ts';

const VALID_CURP = 'GODE561231HDFRRN00';
const WRONG_CHECK_DIGIT = 'GODE561231HDFRRN01';
const UNKNOWN_STATE = 'GODE561231HZZRRN03';

function report(lines: readonly string[]) {
  return reportCurpCheck(lines, {
    pattern: readPattern('curp'),
    stateCodes: readCatalogs().stateCodes,
  });
}

describe('reportCurpCheck', () => {
  it('reports each line by number and outcome', () => {
    expect(report([VALID_CURP, WRONG_CHECK_DIGIT]).results).toEqual([
      { line: 1, outcome: 'valid' },
      { line: 2, outcome: 'check_digit' },
    ]);
  });

  it('ignores surrounding spaces and lower case', () => {
    expect(report([`  ${VALID_CURP.toLowerCase()} `]).results).toEqual([
      { line: 1, outcome: 'valid' },
    ]);
  });

  it('skips blank lines but keeps their numbers', () => {
    expect(report(['', '   ', VALID_CURP]).results).toEqual([
      { line: 3, outcome: 'valid' },
    ]);
  });

  it('reports lines without the shape of a CURP', () => {
    expect(report(['not a curp']).results).toEqual([
      { line: 1, outcome: 'pattern' },
    ]);
  });

  it('reports date and state problems separately from the check digit', () => {
    expect(report([UNKNOWN_STATE]).results).toEqual([
      { line: 1, outcome: 'state' },
    ]);
  });
});

describe('formatCurpReport', () => {
  const formatted = formatCurpReport(
    report([VALID_CURP, WRONG_CHECK_DIGIT, 'not a curp', UNKNOWN_STATE]),
  );

  it('summarizes how many check digits matched', () => {
    expect(formatted).toContain(
      'Checked 3 CURPs: 2 with a matching check digit, 1 without.',
    );
  });

  it('lists every line that is not valid', () => {
    expect(formatted).toContain('Line 2: the check digit does not match');
    expect(formatted).toContain('Line 3: not shaped like a CURP');
    expect(formatted).toContain('Line 4: the state code is not in the catalog');
  });

  it('never prints a CURP', () => {
    expect(formatted).not.toContain(VALID_CURP);
    expect(formatted).not.toContain(WRONG_CHECK_DIGIT);
    expect(formatted).not.toContain(UNKNOWN_STATE);
  });
});
