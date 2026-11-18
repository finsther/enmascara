import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import express from 'express';
import expressFour from 'express-4';

export const EXPRESS_VERSIONS = [
  ['Express 5', express],
  ['Express 4', expressFour],
] as const;

const LOCALHOST = '127.0.0.1';

export interface OutgoingRequest {
  readonly method: string;
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

function send(port: number, outgoing: OutgoingRequest): Promise<void> {
  const body =
    outgoing.body === undefined ? undefined : JSON.stringify(outgoing.body);
  return new Promise((resolve, reject) => {
    const clientRequest = httpRequest(
      {
        host: LOCALHOST,
        port,
        method: outgoing.method,
        path: outgoing.path,
        headers: {
          ...outgoing.headers,
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
      },
      (response) => {
        response.resume();
        response.on('end', resolve);
      },
    );
    clientRequest.on('error', reject);
    clientRequest.end(body);
  });
}

export async function sendTo(
  app: Express,
  outgoing: OutgoingRequest,
): Promise<void> {
  const server = app.listen(0, LOCALHOST);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await send((server.address() as AddressInfo).port, outgoing);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
