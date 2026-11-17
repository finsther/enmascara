import type { NodeOptions } from '@sentry/node';
import type { Redactor } from 'enmascara';

type Integrations = NonNullable<NodeOptions['integrations']>;
type Integration = Exclude<Integrations, (...args: never[]) => unknown>[number];

interface TraceHeader {
  transaction?: string;
}

const TRACE_HEADER_INTEGRATION_NAME = 'EnmascaraTraceHeader';
const CREATE_TRACE_HEADER_HOOK = 'createDsc';

function maskTraceHeader(redactor: Redactor, header: TraceHeader): void {
  if (header.transaction === undefined) {
    return;
  }
  try {
    const masked: unknown = redactor.text(header.transaction);
    if (typeof masked === 'string') {
      header.transaction = masked;
    } else {
      delete header.transaction;
    }
  } catch {
    delete header.transaction;
  }
}

function traceHeaderIntegration(redactor: Redactor): Integration {
  return {
    name: TRACE_HEADER_INTEGRATION_NAME,
    setup: (client) => {
      client.on(CREATE_TRACE_HEADER_HOOK, (header) =>
        maskTraceHeader(redactor, header),
      );
    },
  };
}

export function withTraceHeaderIntegration(
  redactor: Redactor,
  integrations: Integrations | undefined,
): Integrations {
  const integration = traceHeaderIntegration(redactor);
  return typeof integrations === 'function'
    ? (defaults) => [...integrations(defaults), integration]
    : [...(integrations ?? []), integration];
}
