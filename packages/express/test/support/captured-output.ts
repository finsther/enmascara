export interface CapturedOutput {
  readonly lines: () => readonly Readonly<Record<string, unknown>>[];
  readonly raw: () => string;
  readonly destination: { readonly write: (line: string) => void };
}

export function capturedOutput(): CapturedOutput {
  const written: string[] = [];
  return {
    lines: () =>
      written.map(
        (line) => JSON.parse(line) as Readonly<Record<string, unknown>>,
      ),
    raw: () => written.join(''),
    destination: { write: (line) => written.push(line) },
  };
}
