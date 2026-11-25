import type { IdentifierType } from 'enmascara';
import { codeSnippet } from '../code-snippet.ts';
import { RING_EXAMPLES } from '../examples.ts';
import { IDENTIFIER_TYPES, identifierLabel } from '../identifier-labels.ts';
import {
  inputSizeLabel,
  maskedCountLabel,
  maskedDataLabel,
  RING_STRATEGIES,
  settingsSummary,
} from '../ring-copy.ts';
import {
  DEFAULT_RING_OPTIONS,
  type RingOptions,
  type RingStrategy,
} from '../ring-options.ts';
import { type FindingRow, type RingResult, runRing } from '../run-ring.ts';

const COPIED_MESSAGE = 'Resultado copiado';
const COPY_FAILED_MESSAGE = 'No se pudo copiar el resultado';
const READY_ATTRIBUTE = 'data-ring-ready';
const COLLAPSED_ATTRIBUTE = 'data-collapsed';
const PRESSED_ATTRIBUTE = 'aria-pressed';
const EXPANDED_ATTRIBUTE = 'aria-expanded';
const COMPACT_VARIANT = 'compact';
const ESCAPE_KEY = 'Escape';

/** Thrown when the ring markup lacks an element the island needs. */
export class RingMarkupError extends Error {
  override readonly name = 'RingMarkupError';
}

interface RingElements {
  readonly root: HTMLElement;
  readonly input: HTMLTextAreaElement;
  readonly output: HTMLOutputElement;
  readonly typeInputs: readonly HTMLInputElement[];
  readonly strategyButtons: readonly HTMLButtonElement[];
  readonly exampleButtons: readonly HTMLButtonElement[];
  readonly inputSizes: readonly HTMLElement[];
  readonly summaries: readonly HTMLElement[];
  readonly findingTables: readonly HTMLTableSectionElement[];
  readonly findingCards: readonly HTMLUListElement[];
  readonly codes: readonly HTMLElement[];
  readonly demoKeyNotes: readonly HTMLElement[];
  readonly copy: HTMLButtonElement | undefined;
  readonly copyStatus: HTMLElement | undefined;
  readonly settingsToggle: HTMLButtonElement | undefined;
  readonly settingsSummary: HTMLElement | undefined;
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
    root,
    input: requiredElement(root, 'input', HTMLTextAreaElement),
    output: requiredElement(root, 'output', HTMLOutputElement),
    typeInputs: allElements(root, 'type', HTMLInputElement),
    strategyButtons: allElements(root, 'strategy', HTMLButtonElement),
    exampleButtons: allElements(root, 'example', HTMLButtonElement),
    inputSizes: allElements(root, 'input-size', HTMLElement),
    summaries: allElements(root, 'summary', HTMLElement),
    findingTables: allElements(root, 'findings', HTMLTableSectionElement),
    findingCards: allElements(root, 'finding-cards', HTMLUListElement),
    codes: allElements(root, 'code', HTMLElement),
    demoKeyNotes: allElements(root, 'demo-key', HTMLElement),
    copy: optionalElement(root, 'copy', HTMLButtonElement),
    copyStatus: optionalElement(root, 'copy-status', HTMLElement),
    settingsToggle: optionalElement(root, 'settings-toggle', HTMLButtonElement),
    settingsSummary: optionalElement(root, 'settings-summary', HTMLElement),
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
  const value = elements.strategyButtons.find(
    (button) => button.getAttribute(PRESSED_ATTRIBUTE) === 'true',
  )?.dataset.ringStrategy;
  return value !== undefined && isRingStrategy(value)
    ? value
    : DEFAULT_RING_OPTIONS.strategy;
}

function chosenOptions(elements: RingElements): RingOptions {
  return { detect: chosenTypes(elements), strategy: chosenStrategy(elements) };
}

function textElement(tag: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function findingTableRow(row: FindingRow): HTMLTableRowElement {
  const tableRow = document.createElement('tr');
  tableRow.append(
    textElement('td', identifierLabel(row.type)),
    textElement('td', String(row.line)),
    textElement('td', row.result),
  );
  return tableRow;
}

function findingCard(row: FindingRow): HTMLLIElement {
  const item = document.createElement('li');
  const place = document.createElement('span');
  place.append(
    textElement('span', identifierLabel(row.type)),
    textElement('span', `Línea ${row.line}`),
  );
  item.append(place, textElement('span', row.result));
  return item;
}

function summaryLabel(elements: RingElements, result: RingResult): string {
  const count = result.rows.length;
  return elements.root.dataset.ringVariant === COMPACT_VARIANT
    ? maskedDataLabel(count)
    : maskedCountLabel(count);
}

function setText(elements: readonly HTMLElement[], text: string): void {
  for (const element of elements) {
    element.textContent = text;
  }
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
  setText(elements.inputSizes, inputSizeLabel(elements.input.value.length));
  setText(elements.summaries, summaryLabel(elements, result));
  setText(elements.codes, codeSnippet(options));
  for (const table of elements.findingTables) {
    table.replaceChildren(...result.rows.map(findingTableRow));
  }
  for (const list of elements.findingCards) {
    list.replaceChildren(...result.rows.map(findingCard));
  }
  for (const note of elements.demoKeyNotes) {
    note.hidden = options.strategy !== 'incognito';
  }
  if (elements.settingsSummary !== undefined) {
    elements.settingsSummary.textContent = settingsSummary(options);
  }
  keepOneTypeChecked(elements);
}

function pickStrategy(elements: RingElements, picked: HTMLButtonElement): void {
  for (const button of elements.strategyButtons) {
    button.setAttribute(PRESSED_ATTRIBUTE, String(button === picked));
  }
  render(elements);
}

async function copyResult(elements: RingElements): Promise<void> {
  const status = elements.copyStatus;
  try {
    await navigator.clipboard.writeText(elements.output.textContent ?? '');
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
  elements.settingsToggle?.setAttribute(EXPANDED_ATTRIBUTE, 'true');
  elements.settings?.removeAttribute(COLLAPSED_ATTRIBUTE);
}

function collapseSettings(elements: RingElements): void {
  elements.settingsToggle?.setAttribute(EXPANDED_ATTRIBUTE, 'false');
  elements.settings?.setAttribute(COLLAPSED_ATTRIBUTE, '');
}

function isSettingsExpanded(elements: RingElements): boolean {
  return elements.settingsToggle?.getAttribute(EXPANDED_ATTRIBUTE) === 'true';
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

function listen(elements: RingElements): void {
  const renderNow = () => render(elements);
  elements.input.addEventListener('input', renderNow);
  for (const input of elements.typeInputs) {
    input.addEventListener('change', renderNow);
  }
  for (const button of elements.strategyButtons) {
    button.addEventListener('click', () => pickStrategy(elements, button));
  }
  for (const button of elements.exampleButtons) {
    button.addEventListener('click', () => loadExample(elements, button));
  }
  elements.copy?.addEventListener('click', () => {
    void copyResult(elements);
  });
  elements.settingsToggle?.addEventListener('click', () =>
    toggleSettings(elements),
  );
  elements.root.addEventListener('keydown', (event) =>
    collapseSettingsOnEscape(elements, event),
  );
}

/**
 * Brings one ring to life: masks the input as the visitor types, follows
 * the chosen types and strategy, loads examples and copies the result.
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
  listen(elements);
  render(elements);
  root.setAttribute(READY_ATTRIBUTE, 'true');
}
