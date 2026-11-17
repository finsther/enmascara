import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRedactor } from 'enmascara';
import { maskedMorganFormat, maskedPinoHttpOptions } from 'enmascara-express';
import express from 'express';
import morgan from 'morgan';
import { pinoHttp } from 'pino-http';

const LOCALHOST = '127.0.0.1';
const EPHEMERAL_PORT = 0;
const SUCCESS_STATUS_CODE = 200;

const redact = createRedactor();
const app = express();

app.use(express.json());
app.use(pinoHttp(maskedPinoHttpOptions(redact), process.stdout));
app.use(morgan(maskedMorganFormat(redact, morgan, 'combined')));
app.post('/api/cuentas/:clabe', (_request, response) => {
  response.setHeader('set-cookie', 'sesion=secreto-de-sesion');
  response.sendStatus(SUCCESS_STATUS_CODE);
});

const server = app.listen(EPHEMERAL_PORT, LOCALHOST, () => {
  const { port } = server.address() as AddressInfo;
  const body = JSON.stringify({ tarjeta: '4242 4242 4242 4242' });
  const clientRequest = request(
    {
      host: LOCALHOST,
      port,
      method: 'POST',
      path: '/api/cuentas/002180032240946700?curp=GODE561231HDFRRN00',
      headers: {
        authorization: 'Bearer secreto-de-sesion',
        'content-type': 'application/json',
        referer: 'https://banco.example/rfc/GODE561231GR8',
      },
    },
    (response) => {
      response.resume();
      response.on('end', () => server.close());
    },
  );
  clientRequest.end(body);
});
