import type { Redactor } from 'enmascara';
import type { ChildLoggerOptions, LoggerOptions } from 'pino';
import { maskingFormatter, maskingSerializer } from './masking.js';

const DEFAULT_MESSAGE_KEY = 'msg';

type Serializers = NonNullable<LoggerOptions['serializers']>;
type ChildFormatters = NonNullable<ChildLoggerOptions['formatters']>;

export function messageKeyOf(options: {
  readonly messageKey?: string;
}): string {
  return options.messageKey ?? DEFAULT_MESSAGE_KEY;
}

function withMaskedMessage(
  redactor: Redactor,
  messageKey: string,
  serializers: Serializers,
): Serializers {
  return {
    ...serializers,
    [messageKey]: maskingSerializer(redactor, serializers[messageKey]),
  };
}

export function maskedLoggerOptions<
  CustomLevels extends string,
  UseOnlyCustomLevels extends boolean,
>(
  redactor: Redactor,
  options: LoggerOptions<CustomLevels, UseOnlyCustomLevels>,
): LoggerOptions<CustomLevels, UseOnlyCustomLevels> {
  return {
    ...options,
    formatters: {
      ...options.formatters,
      log: maskingFormatter(redactor, options.formatters?.log),
      bindings: maskingFormatter(redactor, options.formatters?.bindings),
    },
    serializers: withMaskedMessage(
      redactor,
      messageKeyOf(options),
      options.serializers ?? {},
    ),
  };
}

function maskedChildFormatters(
  redactor: Redactor,
  formatters: ChildFormatters,
): ChildFormatters {
  const { log, bindings } = formatters;
  return {
    ...formatters,
    ...(log && { log: maskingFormatter(redactor, log) }),
    ...(bindings && { bindings: maskingFormatter(redactor, bindings) }),
  };
}

function maskedChildSerializers(
  redactor: Redactor,
  messageKey: string,
  serializers: Serializers,
): Serializers {
  return Object.hasOwn(serializers, messageKey)
    ? withMaskedMessage(redactor, messageKey, serializers)
    : serializers;
}

export function maskedChildOptions<Options extends ChildLoggerOptions>(
  redactor: Redactor,
  messageKey: string,
  options: Options,
): Options {
  const { formatters, serializers } = options;
  return {
    ...options,
    ...(formatters && {
      formatters: maskedChildFormatters(redactor, formatters),
    }),
    ...(serializers && {
      serializers: maskedChildSerializers(redactor, messageKey, serializers),
    }),
  };
}
