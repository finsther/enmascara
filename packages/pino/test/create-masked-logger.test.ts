import { createRedactor, type Redactor } from 'enmascara';
import { type Logger, type LoggerOptions, pino as pinoTen } from 'pino';
import { pino as pinoNine } from 'pino-9';
import { describe, expect, it } from 'vitest';
import { createMaskedLogger } from '../src/index.js';

const CLABE = '002180032240946700';
const CURP = 'GODE561231HDFRRN00';
const RFC = 'GODE561231GR8';
const CARD = '4242424242424242';
const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;

interface CapturedOutput {
  readonly lines: () => readonly unknown[];
  readonly raw: () => string;
  readonly destination: { readonly write: (line: string) => void };
}

function capturedOutput(): CapturedOutput {
  const written: string[] = [];
  return {
    lines: () => written.map((line): unknown => JSON.parse(line)),
    raw: () => written.join(''),
    destination: { write: (line) => written.push(line) },
  };
}

const PINO_VERSIONS = [
  ['pino 10', pinoTen],
  ['pino 9', pinoNine as unknown as typeof pinoTen],
] as const;

const redact = createRedactor();

function failingRedactor(): Redactor {
  const fail = (): never => {
    throw new Error('masking failed');
  };
  return { text: fail, object: fail, findings: () => [] };
}

function expectNoRawIdentifier(output: CapturedOutput): void {
  for (const identifier of RAW_IDENTIFIERS) {
    expect(output.raw()).not.toContain(identifier);
  }
}

describe.each(PINO_VERSIONS)('createMaskedLogger on %s', (_, pino) => {
  function maskedLogger(
    options: LoggerOptions = {},
    redactor: Redactor = redact,
  ): { readonly logger: Logger; readonly output: CapturedOutput } {
    const output = capturedOutput();
    const logger = createMaskedLogger(
      redactor,
      pino,
      options,
      output.destination,
    );
    return { logger, output };
  }

  it('masks identifiers in the logged object', () => {
    const { logger, output } = maskedLogger();

    logger.info({ clabe: CLABE, nested: { curp: CURP } }, 'pago');

    expect(output.lines()).toMatchObject([
      { clabe: '[CLABE]', nested: { curp: '[CURP]' }, msg: 'pago' },
    ]);
  });

  it('masks identifiers used as keys of the logged object', () => {
    const { logger, output } = maskedLogger();

    logger.info({ [CLABE]: 'cuenta' }, 'pago');

    expect(output.lines()).toMatchObject([{ '[CLABE]': 'cuenta' }]);
  });

  it('masks identifiers in the message', () => {
    const { logger, output } = maskedLogger();

    logger.info(`SPEI a ${CLABE}`);

    expect(output.lines()).toMatchObject([{ msg: 'SPEI a [CLABE]' }]);
  });

  it('masks identifiers in format arguments', () => {
    const { logger, output } = maskedLogger();

    logger.info({ intento: 2 }, 'SPEI a %s de %s', CLABE, CURP);
    logger.info('beneficiario %j', { rfc: RFC });

    expect(output.lines()).toMatchObject([
      { intento: 2, msg: 'SPEI a [CLABE] de [CURP]' },
      { msg: 'beneficiario {"rfc":"[RFC]"}' },
    ]);
  });

  it('masks identifiers in logged errors and their message', () => {
    const { logger, output } = maskedLogger();

    logger.error(new Error(`tarjeta ${CARD} rechazada`));
    logger.error({ err: new Error(`CLABE ${CLABE} inválida`) });

    expect(output.lines()).toMatchObject([
      {
        err: { message: 'tarjeta [CARD] rechazada' },
        msg: 'tarjeta [CARD] rechazada',
      },
      {
        err: { message: 'CLABE [CLABE] inválida' },
        msg: 'CLABE [CLABE] inválida',
      },
    ]);
    expectNoRawIdentifier(output);
  });

  it('masks identifiers returned by a mixin', () => {
    const { logger, output } = maskedLogger({
      mixin: () => ({ clabe: CLABE }),
    });

    logger.info('con mixin');

    expect(output.lines()).toMatchObject([{ clabe: '[CLABE]' }]);
  });

  it('masks identifiers in the base bindings', () => {
    const { logger, output } = maskedLogger({ base: { rfc: RFC } });

    logger.info('inicio');

    expect(output.lines()).toMatchObject([{ rfc: '[RFC]' }]);
  });

  it('masks identifiers in child and grandchild bindings', () => {
    const { logger, output } = maskedLogger();

    const child = logger.child({ curp: CURP });
    child.info('hijo');
    child.child({ card: CARD }).info('nieto');

    expect(output.lines()).toMatchObject([
      { curp: '[CURP]', msg: 'hijo' },
      { curp: '[CURP]', card: '[CARD]', msg: 'nieto' },
    ]);
  });

  it('masks identifiers that child options add', () => {
    const { logger, output } = maskedLogger();

    logger
      .child(
        { clabe: CLABE },
        {
          msgPrefix: `${RFC} `,
          formatters: {
            log: (object) => ({ ...object, curp: CURP }),
            bindings: (bindings) => ({ ...bindings, card: CARD }),
          },
          serializers: { msg: (message: string) => `${message} ${CLABE}` },
        },
      )
      .info({ total: 1 }, 'pago');

    expect(output.lines()).toMatchObject([
      {
        clabe: '[CLABE]',
        card: '[CARD]',
        curp: '[CURP]',
        total: 1,
        msg: '[RFC] pago [CLABE]',
      },
    ]);
  });

  it('keeps the level and redaction options of a child', () => {
    const { logger, output } = maskedLogger({ level: 'info' });

    logger
      .child(
        { curp: CURP },
        { level: 'debug', redact: ['headers.authorization'] },
      )
      .debug({ headers: { authorization: 'Bearer token' } }, 'detalle');

    expect(output.lines()).toMatchObject([
      { curp: '[CURP]', headers: { authorization: '[Redacted]' } },
    ]);
  });

  it('never writes a raw identifier in any line', () => {
    const { logger, output } = maskedLogger({ base: { card: CARD } });

    logger
      .child({ owner: CURP })
      .warn({ [CLABE]: RFC, list: [CARD, CLABE] }, '%s %s', RFC, CURP);

    expectNoRawIdentifier(output);
  });

  it('runs the formatters of the application before masking', () => {
    const { logger, output } = maskedLogger({
      base: { pid: 1 },
      formatters: {
        log: (object) => ({ ...object, servicio: 'pagos', curp: CURP }),
        bindings: (bindings) => ({ ...bindings, rfc: RFC }),
        level: (label) => ({ severity: label.toUpperCase() }),
      },
    });

    logger.info({ clabe: CLABE }, 'pago');

    expect(output.lines()).toMatchObject([
      {
        severity: 'INFO',
        pid: 1,
        rfc: '[RFC]',
        servicio: 'pagos',
        curp: '[CURP]',
        clabe: '[CLABE]',
      },
    ]);
  });

  it('runs the message serializer of the application before masking', () => {
    const { logger, output } = maskedLogger({
      messageKey: 'mensaje',
      serializers: { mensaje: (message: string) => `${CARD} ${message}` },
    });

    logger.info('cargo');

    expect(output.lines()).toMatchObject([{ mensaje: '[CARD] cargo' }]);
  });

  it('keeps the redaction of the application', () => {
    const { logger, output } = maskedLogger({
      redact: ['req.headers.authorization'],
    });

    logger.info(
      { req: { headers: { authorization: 'Bearer token', curp: CURP } } },
      'petición',
    );

    expect(output.lines()).toMatchObject([
      {
        req: { headers: { authorization: '[Redacted]', curp: '[CURP]' } },
      },
    ]);
  });

  it('keeps the other options of the application', () => {
    const { logger, output } = maskedLogger({ level: 'warn' });

    logger.info('descartado');
    logger.warn('conservado');

    expect(output.lines()).toMatchObject([{ msg: 'conservado' }]);
  });

  it('keeps custom levels typed and working', () => {
    const output = capturedOutput();
    const logger = createMaskedLogger(
      redact,
      pino,
      { customLevels: { audit: 35 } },
      output.destination,
    );

    logger.audit(`SPEI a ${CLABE}`);

    expect(output.lines()).toMatchObject([
      { level: 35, msg: 'SPEI a [CLABE]' },
    ]);
  });

  it('leaves the logged object and bindings untouched', () => {
    const { logger } = maskedLogger();
    const payment = { clabe: CLABE, beneficiary: { curp: CURP } };
    const bindings = { rfc: RFC };

    logger.child(bindings).info(payment, 'pago');

    expect(payment).toEqual({ clabe: CLABE, beneficiary: { curp: CURP } });
    expect(bindings).toEqual({ rfc: RFC });
  });

  it('leaves the options of the application untouched', () => {
    const logFormatter = (object: Record<string, unknown>) => object;
    const options: LoggerOptions = {
      level: 'debug',
      formatters: { log: logFormatter },
    };

    maskedLogger(options);

    expect(options).toEqual({
      level: 'debug',
      formatters: { log: logFormatter },
    });
  });

  it('writes [REDACTED] when masking fails', () => {
    const { logger, output } = maskedLogger(
      { base: { curp: CURP } },
      failingRedactor(),
    );

    logger.child({ rfc: RFC }).info({ clabe: CLABE }, '%s', CARD);

    expectNoRawIdentifier(output);
    expect(output.lines()).toMatchObject([
      { enmascara: '[REDACTED]', msg: '[REDACTED]' },
    ]);
  });
});
