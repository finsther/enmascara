/** A text the visitor can load into the ring. */
export interface RingExample {
  /** Stable identifier of the example. */
  readonly id: 'transfers' | 'payload' | 'export';
  /** Name shown on the button that loads it. */
  readonly label: string;
  /** Text loaded into the input. Every identifier comes from `spec/fixtures`. */
  readonly text: string;
}

const TRANSFER_LOG = [
  '2026-11-25T09:14:02Z INFO spei.enviado clabe=002180032240946700 monto=1500.00 referencia=8812034',
  '2026-11-25T09:14:05Z INFO spei.recibido clabe=044890562358251341 monto=320.50 referencia=8812035',
  '2026-11-25T09:15:41Z WARN cargo.rechazado tarjeta=4000 0566 5566 5556 motivo=fondos',
  '2026-11-25T09:16:10Z INFO orden.creada folio=002180032240946701 cliente=TRFR690616HMCYYCI4',
].join('\n');

const PAYLOAD = JSON.stringify(
  {
    cliente: {
      nombre: 'Ana Pérez',
      curp: 'BNQF380215XSRHNDD6',
      rfc: 'GODE561231GR8',
    },
    pago: {
      tarjeta: '4242424242424242',
      clabeDestino: '002180032240946700',
      monto: 2450,
    },
  },
  undefined,
  2,
);

const EXPORT = [
  'id,razon_social,rfc,clabe,monto',
  '1,Comercializadora del Río,COR391215F4A,044890562358251341,18200.00',
  '2,Ana Pérez,GODE561231GR8,002180032240946700,950.00',
  '3,Pedido sin datos,N/A,0000000000,0.00',
].join('\n');

/**
 * Texts that the ring loads with one click: a transfer log, a JSON payload
 * and a CSV export, in that order.
 *
 * @example
 * ```ts
 * RING_EXAMPLES.map(({ label }) => label);
 * // ['Log de transferencias', 'Payload JSON', 'Export CSV']
 * ```
 */
export const RING_EXAMPLES: readonly RingExample[] = [
  { id: 'transfers', label: 'Log de transferencias', text: TRANSFER_LOG },
  { id: 'payload', label: 'Payload JSON', text: PAYLOAD },
  { id: 'export', label: 'Export CSV', text: EXPORT },
];
