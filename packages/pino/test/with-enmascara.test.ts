import { createRedactor, type Redactor } from 'enmascara';
import { type LoggerOptions, pino as pinoTen } from 'pino';
import { pino as pinoNine } from 'pino-9';
import { describe, expect, it } from 'vitest';
import { withEnmascara } from '../src/index.js';

const CLABE = '002180032240946700';
const CURP = 'GODE561231HDFRRN00';
const RFC = 'GODE561231GR8';
const CARD = '4242424242424242';
const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;

interface LogLine {
  readonly [field: string]: unknown;
}

interface CapturedLogger {
  readonly logger: ReturnType<typeof pinoTen>;
  readonly lines: () => readonly LogLine[];
  readonly rawOutput: () => string;
}

type CreateLogger = (options: LoggerOptions) => CapturedLogger;

function capturingWith(createPino: typeof pinoTen): CreateLogger {
  return (options) => {
    const written: string[] = [];
    const destination = { write: (line: string) => written.push(line) };
    const logger = createPino(options, destination);
    return {
      logger,
      lines: () => written.map((line) => JSON.parse(line) as LogLine),
      rawOutput: () => written.join(''),
    };
  };
}

const PINO_VERSIONS = [
  ['pino 10', capturingWith(pinoTen)],
  ['pino 9', capturingWith(pinoNine as unknown as typeof pinoTen)],
] as const;

const redact = createRedactor();

function failingRedactor(): Redactor {
  const fail = (): never => {
    throw new Error('masking failed');
  };
  return { text: fail, object: fail, findings: () => [] };
}

function onlyLine(captured: CapturedLogger): LogLine {
  const [line, ...rest] = captured.lines();
  expect(rest).toEqual([]);
  if (line === undefined) {
    throw new Error('expected one log line');
  }
  return line;
}

describe.each(PINO_VERSIONS)('withEnmascara on %s', (_, createLogger) => {
  it('masks identifiers in the logged object', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.info({ clabe: CLABE, nested: { curp: CURP } }, 'pago');

    expect(onlyLine(captured)).toMatchObject({
      clabe: '[CLABE]',
      nested: { curp: '[CURP]' },
      msg: 'pago',
    });
  });

  it('masks identifiers in the message', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.info(`SPEI a ${CLABE}`);

    expect(onlyLine(captured).msg).toBe('SPEI a [CLABE]');
  });

  it('masks identifiers in format arguments', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.info({ intento: 2 }, 'SPEI a %s de %s', CLABE, CURP);

    expect(onlyLine(captured)).toMatchObject({
      intento: 2,
      msg: 'SPEI a [CLABE] de [CURP]',
    });
  });

  it('masks identifiers in object format arguments', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.info('beneficiario %j', { rfc: RFC });

    expect(onlyLine(captured).msg).toBe('beneficiario {"rfc":"[RFC]"}');
  });

  it('masks identifiers in the base bindings', () => {
    const captured = createLogger(
      withEnmascara(redact, { base: { rfc: RFC } }),
    );

    captured.logger.info('inicio');

    expect(onlyLine(captured).rfc).toBe('[RFC]');
  });

  it('masks identifiers in child bindings', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.child({ curp: CURP }).info('kyc');

    expect(onlyLine(captured).curp).toBe('[CURP]');
  });

  it('masks identifiers in logged errors', () => {
    const captured = createLogger(withEnmascara(redact));

    captured.logger.error(new Error(`tarjeta ${CARD} rechazada`));
    captured.logger.error(
      { err: new Error(`CLABE ${CLABE} inválida`) },
      'transferencia',
    );

    expect(captured.rawOutput()).toContain('tarjeta [CARD] rechazada');
    expect(captured.rawOutput()).toContain('CLABE [CLABE] inválida');
  });

  it('masks identifiers returned by a mixin', () => {
    const captured = createLogger(
      withEnmascara(redact, { mixin: () => ({ clabe: CLABE }) }),
    );

    captured.logger.info('con mixin');

    expect(onlyLine(captured).clabe).toBe('[CLABE]');
  });

  it('never writes a raw identifier in any line', () => {
    const captured = createLogger(
      withEnmascara(redact, { base: { card: CARD } }),
    );

    captured.logger
      .child({ owner: CURP })
      .warn({ [CLABE]: RFC, list: [CARD, CLABE] }, '%s %s', RFC, CURP);

    for (const identifier of RAW_IDENTIFIERS) {
      expect(captured.rawOutput()).not.toContain(identifier);
    }
  });

  it('runs the log formatter of the application before masking', () => {
    const captured = createLogger(
      withEnmascara(redact, {
        formatters: {
          log: (object) => ({ ...object, servicio: 'pagos', curp: CURP }),
        },
      }),
    );

    captured.logger.info({ clabe: CLABE }, 'pago');

    expect(onlyLine(captured)).toMatchObject({
      servicio: 'pagos',
      curp: '[CURP]',
      clabe: '[CLABE]',
    });
  });

  it('runs the bindings formatter of the application before masking', () => {
    const captured = createLogger(
      withEnmascara(redact, {
        base: { pid: 1 },
        formatters: { bindings: (bindings) => ({ ...bindings, rfc: RFC }) },
      }),
    );

    captured.logger.info('inicio');

    expect(onlyLine(captured)).toMatchObject({ pid: 1, rfc: '[RFC]' });
  });

  it('keeps the level formatter of the application', () => {
    const captured = createLogger(
      withEnmascara(redact, {
        formatters: { level: (label) => ({ severity: label.toUpperCase() }) },
      }),
    );

    captured.logger.info('nivel');

    expect(onlyLine(captured).severity).toBe('INFO');
  });

  it('runs the log method hook of the application before masking', () => {
    const hookedArguments: unknown[][] = [];
    const captured = createLogger(
      withEnmascara(redact, {
        hooks: {
          logMethod(inputArguments, method) {
            hookedArguments.push([...inputArguments]);
            return method.apply(this, [`${CARD} ${inputArguments[0]}`]);
          },
        },
      }),
    );

    captured.logger.info('cargo');

    expect(hookedArguments).toEqual([['cargo']]);
    expect(onlyLine(captured).msg).toBe('[CARD] cargo');
  });

  it('leaves the logged object untouched', () => {
    const captured = createLogger(withEnmascara(redact));
    const payment = { clabe: CLABE, beneficiary: { curp: CURP } };

    captured.logger.info(payment, 'pago');

    expect(payment).toEqual({ clabe: CLABE, beneficiary: { curp: CURP } });
  });

  it('leaves the options of the application untouched', () => {
    const logFormatter = (object: Record<string, unknown>) => object;
    const options: LoggerOptions = {
      level: 'debug',
      formatters: { log: logFormatter },
    };

    withEnmascara(redact, options);

    expect(options).toEqual({
      level: 'debug',
      formatters: { log: logFormatter },
    });
  });

  it('keeps the other options of the application', () => {
    const captured = createLogger(
      withEnmascara(redact, { level: 'warn', messageKey: 'mensaje' }),
    );

    captured.logger.info('descartado');
    captured.logger.warn('conservado');

    expect(onlyLine(captured).mensaje).toBe('conservado');
  });

  it('writes [REDACTED] instead of the line when masking fails', () => {
    const captured = createLogger(
      withEnmascara(failingRedactor(), { base: { curp: CURP } }),
    );

    captured.logger.child({ rfc: RFC }).info({ clabe: CLABE }, '%s', CARD);

    const output = captured.rawOutput();
    for (const identifier of RAW_IDENTIFIERS) {
      expect(output).not.toContain(identifier);
    }
    expect(onlyLine(captured).msg).toBe('[REDACTED]');
  });
});
