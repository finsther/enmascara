import type { Redactor } from 'enmascara';
import type {
  Bindings,
  ChildLoggerOptions,
  DestinationStream,
  Logger,
  LoggerOptions,
  pino,
} from 'pino';
import {
  maskedChildOptions,
  maskedLoggerOptions,
  messageKeyOf,
} from './masked-options.js';
import { maskRecord } from './masking.js';

function maskChildCreation<
  CustomLevels extends string,
  UseOnlyCustomLevels extends boolean,
>(
  redactor: Redactor,
  messageKey: string,
  logger: Logger<CustomLevels, UseOnlyCustomLevels>,
): Logger<CustomLevels, UseOnlyCustomLevels> {
  const createChild = logger.child;
  const masked: Logger<CustomLevels, UseOnlyCustomLevels> =
    Object.create(logger);
  Object.defineProperty(masked, 'child', {
    value(this: unknown, bindings: Bindings, options?: ChildLoggerOptions) {
      return Reflect.apply(createChild, this, [
        maskRecord(redactor, bindings),
        options && maskedChildOptions(redactor, messageKey, options),
      ]);
    },
  });
  return masked;
}

/**
 * Creates a pino logger that masks every identifier the redactor detects
 * before a line is written: the logged object and its keys, mixins, errors,
 * the message after its format arguments are interpolated, and the bindings
 * of the logger, its children and their descendants.
 *
 * The formatters, serializers and redaction of the application still run,
 * before masking, and the options received are never modified. Pino is
 * received as a parameter, so this package never loads it on its own.
 *
 * Masking fails closed: if the redactor throws, the message is written as
 * `[REDACTED]` and the object or bindings as `{ enmascara: '[REDACTED]' }`.
 *
 * @param redactor - Redactor created with `createRedactor` from `enmascara`.
 * @param createPino - The `pino` function of the application, version 9 or 10.
 * @param options - Pino options of the application. Defaults to none.
 * @param destination - Where lines are written. Defaults to pino's, the
 * standard output.
 * @returns The logger; children created from it are masked too.
 * @example
 * ```ts
 * import { pino } from 'pino';
 * import { createRedactor } from 'enmascara';
 * import { createMaskedLogger } from 'enmascara-pino';
 *
 * const logger = createMaskedLogger(createRedactor(), pino, { level: 'info' });
 *
 * logger
 *   .child({ curp: 'GODE561231HDFRRN00' })
 *   .info('SPEI a %s', '002180032240946700');
 * // {"level":30,...,"curp":"[CURP]","msg":"SPEI a [CLABE]"}
 * ```
 */
export function createMaskedLogger<
  CustomLevels extends string = never,
  UseOnlyCustomLevels extends boolean = boolean,
>(
  redactor: Redactor,
  createPino: typeof pino,
  options: LoggerOptions<CustomLevels, UseOnlyCustomLevels> = {},
  destination?: DestinationStream,
): Logger<CustomLevels, UseOnlyCustomLevels> {
  const logger = createPino(
    maskedLoggerOptions(redactor, options),
    destination,
  );
  return maskChildCreation(redactor, messageKeyOf(options), logger);
}
