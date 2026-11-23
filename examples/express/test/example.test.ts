import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const { ENMASCARA_PACKED_EXAMPLES: packedExamples } = process.env;
const exampleDirectory =
  packedExamples === undefined
    ? fileURLToPath(new URL('..', import.meta.url))
    : join(packedExamples, 'express');
const NEVER_WRITTEN = [
  '002180032240946700',
  'GODE561231HDFRRN00',
  'GODE561231GR8',
  '4242 4242 4242 4242',
  'secreto-de-sesion',
  'tarjeta',
] as const;

function runExample(): string {
  return execFileSync(process.execPath, ['index.ts'], {
    cwd: exampleDirectory,
    encoding: 'utf8',
  });
}

function isJson(line: string): boolean {
  return line.startsWith('{');
}

describe('Express example', () => {
  const output = runExample();
  const lines = output.trim().split('\n');

  it('prints the line pino-http writes, masked', () => {
    const jsonLines = lines
      .filter(isJson)
      .map((line): unknown => JSON.parse(line));

    expect(jsonLines).toMatchObject([
      {
        req: {
          url: '/api/cuentas/[CLABE]?curp=[CURP]',
          query: { curp: '[CURP]' },
          headers: { authorization: '[REDACTED]' },
        },
        res: { statusCode: 200, headers: { 'set-cookie': '[REDACTED]' } },
        params: { clabe: '[CLABE]' },
      },
    ]);
  });

  it('prints the line morgan writes, masked', () => {
    const [morganLine, ...others] = lines.filter((line) => !isJson(line));

    expect(others).toEqual([]);
    expect(morganLine).toContain(
      '"POST /api/cuentas/[CLABE]?curp=[CURP] HTTP/1.1" 200',
    );
    expect(morganLine).toContain('"https://banco.example/rfc/[RFC]"');
  });

  it.each(NEVER_WRITTEN)('never prints %s', (value) => {
    expect(output).not.toContain(value);
  });
});
