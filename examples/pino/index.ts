import { createRedactor } from 'enmascara';
import { createMaskedLogger } from 'enmascara-pino';
import { pino } from 'pino';

const logger = createMaskedLogger(createRedactor(), pino);

const request = logger.child({
  requestId: 'req-7f3a',
  curp: 'GODE561231HDFRRN00',
});

request.info(
  { clabe: '002180032240946700', amount: 1500 },
  'transferencia creada',
);
request.warn('reintento de cargo a la tarjeta %s', '4242 4242 4242 4242');
request.error(new Error('RFC GODE561231GR8 no coincide con el beneficiario'));
