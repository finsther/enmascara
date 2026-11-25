import type { IdentifierType } from 'enmascara';
import { codeSnippet } from '../code-snippet.ts';
import { RING_EXAMPLES } from '../examples.ts';
import { IDENTIFIER_TYPES, identifierLabel } from '../identifier-labels.ts';
import {
  DEFAULT_RING_OPTIONS,
  type RingOptions,
  type RingStrategy,
} from '../ring-options.ts';
import { type FindingRow, runRing } from '../run-ring.ts';

const COPIED_MESSAGE = 'Código copiado';
const COPY_FAILED_MESSAGE = 'No se pudo copiar el código';
const READY_ATTRIBUTE = 'data-ring-ready';
const COLLAPSED_ATTRIBUTE = 'data-collapsed';
const ESCAPE_KEY = 'Escape';
const RING_STRATEGIES: readonly RingStrategy[] = [
  'fullMask',
  'halfMask',
  'incognito',
];

/** Thrown when the ring markup lacks an element the island needs. */
export class RingMarkupError extends Error {
  override readonly name = 'RingMarkupError';
}

interface RingElements {
  readonly input: HTMLTextAreaElement;
  readonly output: HTMLOutputElement;
  readonly typeInputs: readonly HTMLInputElement[];
  readonly strategyInputs: readonly HTMLInputElement[];
  readonly exampleButtons: readonly HTMLButtonElement[];
  readonly findings: HTMLTableSectionElement | undefined;
  readonly code: HTMLElement | undefined;
  readonly copy: HTMLButtonElement | undefined;
  readonly copyStatus: HTMLElement | undefined;
  readonly demoKeyWarning: HTMLElement | undefined;
  readonly settingsToggle: HTMLButtonElement | undefined;
  readonly settings: HTMLElement | undefined;
}

function optionalElement<Type extends Element>(
  root: HTMLElement,
  name: string,
  kind: abstract new () => Type,
): Type | undefined {
  const element = root.querySelector(`[data-ring-${name}]`);
  return element instanceof kind ? element : undefined;
}

function requiredElement<Type extends Element>(
  root: HTMLElement,
  name: string,
  kind: abstract new () => Type,
): Type {
  const element = optionalElement(root, name, kind);
  if (element === undefined) {
    throw new RingMarkupError(`The ring needs its ${name} element`);
  }
  return element;
}

function allElements<Type extends Element>(
  root: HTMLElement,
  name: string,
  kind: abstract new () => Type,
): readonly Type[] {
  return [...root.querySelectorAll(`[data-ring-${name}]`)].filter(
    (element): element is Type => element instanceof kind,
  );
}

function ringElements(root: HTMLElement): RingElements {
  return {
    input: requiredElement(root, 'input', HTMLTextAreaElement),
    output: requiredElement(root, 'output', HTMLOutputElement),
    typeInputs: allElements(root, 'type', HTMLInputElement),
    strategyInputs: allElements(root, 'strategy', HTMLInputElement),
    exampleButtons: allElements(root, 'example', HTMLButtonElement),
    findings: optionalElement(root, 'findings', HTMLTableSectionElement),
    code: optionalElement(root, 'code', HTMLElement),
    copy: optionalElement(root, 'copy', HTMLButtonElement),
    copyStatus: optionalElement(root, 'copy-status', HTMLElement),
    demoKeyWarning: optionalElement(root, 'demo-key', HTMLElement),
    settingsToggle: optionalElement(root, 'settings-toggle', HTMLButtonElement),
    settings: optionalElement(root, 'settings', HTMLElement),
  };
}

function isIdentifierType(value: string): value is IdentifierType {
  return IDENTIFIER_TYPES.some((type) => type === value);
}

function isRingStrategy(value: string): value is RingStrategy {
  return RING_STRATEGIES.some((strategy) => strategy === value);
}

function chosenTypes(elements: RingElements): RingOptions['detect'] {
  const [first, ...rest] = elements.typeInputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isIdentifierType);
  return first === undefined ? DEFAULT_RING_OPTIONS.detect : [first, ...rest];
}

function chosenStrategy(elements: RingElements): RingStrategy {
  const value = elements.strategyInputs.find((input) => input.checked)?.value;
  return value !== undefined && isRingStrategy(value)
    ? value
    : DEFAULT_RING_OPTIONS.strategy;
}

function chosenOptions(elements: RingElements): RingOptions {
  return { detect: chosenTypes(elements), strategy: chosenStrategy(elements) };
}

function findingRowElement(row: FindingRow): HTMLTableRowElement {
  const tableRow = document.createElement('tr');
  for (const text of [
    identifierLabel(row.type),
    String(row.line),
    row.result,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = text;
    tableRow.append(cell);
  }
  return tableRow;
}

function keepOneTypeChecked(elements: RingElements): void {
  const checked = elements.typeInputs.filter((input) => input.checked);
  for (const input of elements.typeInputs) {
    input.disabled = checked.length === 1 && input.checked;
  }
}

function render(elements: RingElements): void {
  const options = chosenOptions(elements);
  const result = runRing(elements.input.value, options);
  elements.output.textContent = result.output;
  elements.findings?.replaceChildren(...result.rows.map(findingRowElement));
  if (elements.code !== undefined) {
    elements.code.textContent = codeSnippet(options);
  }
  if (elements.demoKeyWarning !== undefined) {
    elements.demoKeyWarning.hidden = options.strategy !== 'incognito';
  }
  keepOneTypeChecked(elements);
}

async function copyCode(elements: RingElements): Promise<void> {
  const status = elements.copyStatus;
  try {
    await navigator.clipboard.writeText(elements.code?.textContent ?? '');
    if (status !== undefined) {
      status.textContent = COPIED_MESSAGE;
    }
  } catch {
    if (status !== undefined) {
      status.textContent = COPY_FAILED_MESSAGE;
    }
  }
}

function expandSettings(elements: RingElements): void {
  elements.settingsToggle?.setAttribute('aria-expanded', 'true');
  elements.settings?.removeAttribute(COLLAPSED_ATTRIBUTE);
}

function collapseSettings(elements: RingElements): void {
  elements.settingsToggle?.setAttribute('aria-expanded', 'false');
  elements.settings?.setAttribute(COLLAPSED_ATTRIBUTE, '');
}

function isSettingsExpanded(elements: RingElements): boolean {
  return elements.settingsToggle?.getAttribute('aria-expanded') === 'true';
}

function toggleSettings(elements: RingElements): void {
  if (isSettingsExpanded(elements)) {
    collapseSettings(elements);
  } else {
    expandSettings(elements);
  }
}

function collapseSettingsOnEscape(
  elements: RingElements,
  event: KeyboardEvent,
): void {
  if (event.key !== ESCAPE_KEY || !isSettingsExpanded(elements)) {
    return;
  }
  collapseSettings(elements);
  elements.settingsToggle?.focus();
}

function loadExample(elements: RingElements, button: HTMLButtonElement): void {
  const example = RING_EXAMPLES.find(
    ({ id }) => id === button.dataset.ringExample,
  );
  if (example !== undefined) {
    elements.input.value = example.text;
    render(elements);
  }
}

function listen(root: HTMLElement, elements: RingElements): void {
  const renderNow = () => render(elements);
  elements.input.addEventListener('input', renderNow);
  for (const input of [...elements.typeInputs, ...elements.strategyInputs]) {
    input.addEventListener('change', renderNow);
  }
  for (const button of elements.exampleButtons) {
    button.addEventListener('click', () => loadExample(elements, button));
  }
  elements.copy?.addEventListener('click', () => {
    void copyCode(elements);
  });
  elements.settingsToggle?.addEventListener('click', () =>
    toggleSettings(elements),
  );
  root.addEventListener('keydown', (event) =>
    collapseSettingsOnEscape(elements, event),
  );
}

/**
 * Brings one ring to life: masks the input as the visitor types, follows
 * the chosen types and strategy, loads examples and copies the code.
 *
 * @param root - Element rendered by `Ring.astro`.
 * @throws {@link RingMarkupError} If the input or the output is missing.
 * @example
 * ```ts
 * attachRing(document.querySelector('[data-ring]'));
 * ```
 */
export function attachRing(root: HTMLElement): void {
  const elements = ringElements(root);
  listen(root, elements);
  render(elements);
  root.setAttribute(READY_ATTRIBUTE, 'true');
}
