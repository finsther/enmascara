import type { Redactor } from 'enmascara';

export const CLABE = '002180032240946700';
export const CURP = 'GODE561231HDFRRN00';
export const RFC = 'GODE561231GR8';
export const CARD = '4242424242424242';
export const RAW_IDENTIFIERS = [CLABE, CURP, RFC, CARD] as const;
export const CREDENTIAL = 'Bearer secreto-de-sesion';

export function failingRedactor(): Redactor {
  const fail = (): never => {
    throw new Error('masking failed');
  };
  return { text: fail, object: fail, findings: () => [] };
}

export function redactorReturning(value: unknown): Redactor {
  return {
    text: () => '[TEXT]',
    object: () => value,
    findings: () => [],
  };
}
