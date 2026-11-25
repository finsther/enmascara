import type { Redactor } from 'enmascara';
import type { ChildLoggerOptions, LoggerOptions } from 'pino';
import { maskingFormatter, maskingSerializer } from './masking.js';

const DEFAULT_MESSAGE_KEY = 'msg';

type Serializers = NonNullable<LoggerOptions['serializers']>;
type ChildFormatters = NonNullable<ChildLoggerOptions['formatters']>;
type LogFormatter = NonNullable<ChildFormatters['log']>;

export interface MaskingContext {
  readonly messageKey: string;
  readonly serializedKeys: ReadonlySet<string>;
  readonly applicationLogFormatter: LogFormatter | undefined;
}

export function messageKeyOf(options: {
  readonly messageKey?: string;
}): string {
  return options.messageKey ?? DEFAULT_MESSAGE_KEY;
}

function maskedSerializers(
  redactor: Redactor,
  serializers: Serializers,
): Serializers {
  const masked = Object.entries(serializers).map(([key, serializer]) => [
    key,
    maskingSerializer(redactor, serializer),
  ]);
  return { ...serializers, ...Object.fromEntries(masked) };
}

function maskedRootSerializers(
  redactor: Redactor,
  messageKey: string,
  serializers: Serializers,
): Serializers {
  return {
    ...maskedSerializers(redactor, serializers),
    [messageKey]: maskingSerializer(redactor, serializers[messageKey]),
  };
}

function serializedKeysOf(serializers: Serializers): ReadonlySet<string> {
  return new Set(Object.keys(serializers));
}

function objectFormatterOf(
  formatter: ((object: Record<string, unknown>) => object) | undefined,
): LogFormatter | undefined {
  return formatter && ((object: object) => formatter({ ...object }));
}

export function rootMaskingContext<
  CustomLevels extends string,
  UseOnlyCustomLevels extends boolean,
>(options: LoggerOptions<CustomLevels, UseOnlyCustomLevels>): MaskingContext {
  const messageKey = messageKeyOf(options);
  return {
    messageKey,
    serializedKeys: serializedKeysOf(options.serializers ?? {}),
    applicationLogFormatter: objectFormatterOf(options.formatters?.log),
  };
}

export function maskedLoggerOptions<
  CustomLevels extends string,
  UseOnlyCustomLevels extends boolean,
>(
  redactor: Redactor,
  options: LoggerOptions<CustomLevels, UseOnlyCustomLevels>,
  context: MaskingContext,
): LoggerOptions<CustomLevels, UseOnlyCustomLevels> {
  return {
    ...options,
    formatters: {
      ...options.formatters,
      log: (object: Record<string, unknown>) =>
        maskingFormatter(
          redactor,
          context.applicationLogFormatter,
          context.serializedKeys,
        )(object),
      bindings: maskingFormatter(
        redactor,
        options.formatters?.bindings,
        context.serializedKeys,
      ),
    },
    serializers: maskedRootSerializers(
      redactor,
      context.messageKey,
      options.serializers ?? {},
    ),
  };
}

export function childMaskingContext(
  parent: MaskingContext,
  options: ChildLoggerOptions | undefined,
): MaskingContext {
  const childSerializedKeys = serializedKeysOf(options?.serializers ?? {});
  return {
    messageKey: parent.messageKey,
    serializedKeys: new Set([...parent.serializedKeys, ...childSerializedKeys]),
    applicationLogFormatter:
      options?.formatters?.log ?? parent.applicationLogFormatter,
  };
}

function maskedChildFormatters(
  redactor: Redactor,
  formatters: ChildFormatters,
  context: MaskingContext,
): ChildFormatters {
  const { bindings } = formatters;
  return {
    ...formatters,
    log: maskingFormatter(
      redactor,
      context.applicationLogFormatter,
      context.serializedKeys,
    ),
    ...(bindings && {
      bindings: maskingFormatter(redactor, bindings, context.serializedKeys),
    }),
  };
}

export function maskedChildOptions<Options extends ChildLoggerOptions>(
  redactor: Redactor,
  options: Options,
  child: MaskingContext,
): Options {
  const { formatters, serializers } = options;
  return {
    ...options,
    formatters: maskedChildFormatters(redactor, formatters ?? {}, child),
    ...(serializers && {
      serializers: maskedSerializers(redactor, serializers),
    }),
  };
}
