import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { parse } from 'yaml';

declare global {
  interface Window {
    xssExecuted: boolean;
  }
}

const RING_PATH = '/ring';
const MOBILE_WIDTH = 390;
const MINIMUM_TARGET_SIZE = 44;
const SHORT_VIEWPORT_HEIGHT = 300;
const MAXIMUM_STACK_GAP = 80;
const CLABE = '002180032240946700';
const CARD = '4242424242424242';
const CURP = 'BNQF380215XSRHNDD6';
const RFC = 'GODE561231GR8';
const DEMO_KEY_WARNING = /llave de demostración/i;
const CODE_PANEL = 'Lo mismo en tu código';
const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];
const XSS_PAYLOADS = [
  '<img src=x onerror="window.xssExecuted=true">',
  '<svg onload="window.xssExecuted=true"></svg>',
  '<script>window.xssExecuted=true</script>',
  '"><iframe src="javascript:window.xssExecuted=true"></iframe>',
  `<a href="javascript:window.xssExecuted=true">${CLABE}</a>`,
];
const FIXTURE_TYPES = ['clabe', 'curp', 'rfc', 'card'];

interface Fixture {
  readonly valid: readonly { readonly value: string }[];
}

function validFixtureValues(): readonly string[] {
  return FIXTURE_TYPES.flatMap((type) => {
    const url = new URL(`../../../spec/fixtures/${type}.yaml`, import.meta.url);
    const fixture: Fixture = parse(readFileSync(url, 'utf8'));
    return fixture.valid.map(({ value }) => value);
  });
}

function isMobile(page: Page): boolean {
  return page.viewportSize()?.width === MOBILE_WIDTH;
}

function ring(page: Page) {
  const region = page.getByRole('region', { name: 'El ring', exact: true });
  return {
    region,
    input: region.getByRole('textbox', { name: 'Entrada' }),
    inputSize: region.locator('[data-ring-input-size]'),
    output: region.getByRole('status', { name: 'Resultado' }),
    summary: region.locator('[data-ring-summary]'),
    findingsTable: region.getByRole('table', { name: 'Hallazgos' }),
    findingsList: region.getByRole('list', { name: 'Hallazgos' }),
    code: region.locator('[data-ring-code]:visible'),
    codeToggle: region.locator('summary', { hasText: CODE_PANEL }),
    copy: region.getByRole('button', { name: /^Copiar/ }),
    settings: region.getByRole('button', { name: /^Ajustes/ }),
    type: (name: string) => region.getByRole('checkbox', { name }),
    strategy: (name: string) =>
      region.getByRole('button', { name, exact: true }),
    example: (name: string) =>
      region.getByRole('button', { name, exact: true }),
  };
}

type Ring = ReturnType<typeof ring>;

async function openRing(page: Page): Promise<Ring> {
  await page.goto(RING_PATH);
  await page.waitForLoadState('networkidle');
  const opened = ring(page);
  await expect(opened.region).toHaveAttribute('data-ring-ready', 'true');
  return opened;
}

async function openSettingsOnMobile(page: Page, opened: Ring) {
  if (isMobile(page)) {
    await opened.settings.click();
  }
}

async function openCodeOnMobile(page: Page, opened: Ring) {
  if (isMobile(page)) {
    await opened.codeToggle.click();
  }
}

async function findingRows(page: Page, opened: Ring) {
  return isMobile(page)
    ? opened.findingsList.getByRole('listitem')
    : opened.findingsTable.locator('tbody').getByRole('row');
}

async function accessibilityViolations(page: Page): Promise<readonly string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  return violations.map(
    ({ id, nodes }) =>
      `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`,
  );
}

async function storedState(page: Page): Promise<readonly string[]> {
  const stored = await page.evaluate(async () => [
    ...Object.keys(localStorage).map((key) => `localStorage:${key}`),
    ...Object.keys(sessionStorage).map((key) => `sessionStorage:${key}`),
    ...(await indexedDB.databases()).map(({ name }) => `indexedDB:${name}`),
  ]);
  const cookies = await page.context().cookies();
  return [...stored, ...cookies.map(({ name }) => `cookie:${name}`)];
}

async function useEveryControl(page: Page, opened: Ring) {
  await opened.input.fill(`SPEI a ${CLABE}`);
  await opened.input.press('End');
  await page.keyboard.insertText(`\ntarjeta ${CARD}`);
  for (const example of [
    'Log de transferencias',
    'Payload JSON',
    'Export CSV',
  ]) {
    await opened.example(example).click();
  }
  await openSettingsOnMobile(page, opened);
  await opened.type('CURP').uncheck();
  await opened.type('CURP').check();
  for (const strategy of ['Máscara completa', 'Incógnito', 'Media máscara']) {
    await opened.strategy(strategy).click();
  }
  await openCodeOnMobile(page, opened);
  await opened.copy.click();
}

test.describe('the ring', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('masks a fixture in the browser with the package', async ({ page }) => {
    const opened = await openRing(page);

    await opened.input.fill(`SPEI a ${CLABE}`);

    await expect(opened.output).toHaveText('SPEI a **************6700');
  });

  test('starts with the transfer log and the half mask', async ({ page }) => {
    const opened = await openRing(page);

    await expect(opened.input).toHaveValue(/spei\.enviado/);
    await expect(opened.output).toContainText('**************6700');
    await openSettingsOnMobile(page, opened);
    await expect(opened.strategy('Media máscara')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('masks live with the chosen strategy', async ({ page }) => {
    const opened = await openRing(page);
    await opened.input.fill(`tarjeta ${CARD}`);
    await openSettingsOnMobile(page, opened);

    await expect(opened.output).toHaveText('tarjeta ************4242');

    await opened.strategy('Incógnito').click();
    await expect(opened.output).toHaveText(/^tarjeta \[CARD:[0-9a-f]{6}\]$/);
    await expect(opened.strategy('Incógnito')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(opened.strategy('Media máscara')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await opened.strategy('Máscara completa').click();
    await expect(opened.output).toHaveText('tarjeta [CARD]');
  });

  test('masks only the selected types and keeps at least one', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await opened.input.fill(`${CLABE} ${CARD} ${CURP} ${RFC}`);
    await openSettingsOnMobile(page, opened);
    await opened.strategy('Máscara completa').click();

    for (const name of ['Tarjeta', 'CURP', 'RFC']) {
      await opened.type(name).uncheck();
    }

    await expect(opened.output).toHaveText(`[CLABE] ${CARD} ${CURP} ${RFC}`);
    await expect(opened.type('CLABE')).toBeChecked();
    await expect(opened.type('CLABE')).toBeDisabled();
  });

  test('counts the characters of the input', async ({ page }) => {
    const opened = await openRing(page);

    await opened.input.fill('abc');

    await expect(opened.inputSize).toHaveText('3 caracteres');
  });

  test('loads each example', async ({ page }) => {
    const opened = await openRing(page);

    await opened.example('Payload JSON').click();

    await expect(opened.input).toHaveValue(/"curp"/);
    await expect(opened.output).toContainText('****************D6');
    await expect(opened.output).not.toContainText(CURP);
  });

  test('lists the type, line and masked result of each finding', async ({
    page,
  }) => {
    const opened = await openRing(page);

    await opened.input.fill(`inicio\nSPEI a ${CLABE}\n\ntarjeta ${CARD}`);

    const rows = await findingRows(page, opened);
    if (isMobile(page)) {
      await expect(rows).toHaveText([
        'CLABELínea 2**************6700',
        'TarjetaLínea 4************4242',
      ]);
    } else {
      await expect(opened.findingsTable.getByRole('columnheader')).toHaveText([
        'Tipo',
        'Línea',
        'Resultado',
      ]);
      await expect(rows).toHaveText([
        'CLABE2**************6700',
        'Tarjeta4************4242',
      ]);
    }
    await expect(opened.summary).toHaveText('2 enmascarados');
  });

  test('never shows a detected value outside the input', async ({ page }) => {
    const opened = await openRing(page);
    const values = validFixtureValues();

    await opened.input.fill(values.join('\n'));
    await expect(await findingRows(page, opened)).toHaveCount(values.length);

    const shown = await page.evaluate(() => {
      const copy = document.body.cloneNode(true) as HTMLElement;
      for (const field of copy.querySelectorAll('textarea')) {
        field.remove();
      }
      const attributes = [...copy.querySelectorAll('*')].flatMap((element) =>
        [...element.attributes].map(({ value }) => value),
      );
      return [copy.textContent ?? '', ...attributes].join('\n');
    });
    const leaked = values.filter((value) => shown.includes(value));
    expect(leaked).toEqual([]);
  });

  test('shows code built from the options and never from the input', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await opened.input.fill(`SPEI a ${CLABE}`);
    await openSettingsOnMobile(page, opened);

    await opened.type('RFC').uncheck();
    await opened.strategy('Máscara completa').click();
    await openCodeOnMobile(page, opened);

    await expect(opened.code).toContainText(
      "detect: ['clabe', 'curp', 'card']",
    );
    await expect(opened.code).toContainText("strategy: 'redact'");
    await expect(opened.code).not.toContainText(CLABE);
  });

  test('copies the masked result to the clipboard', async ({ page }) => {
    const opened = await openRing(page);
    await opened.input.fill(`SPEI a ${CLABE}`);

    await opened.copy.click();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe('SPEI a **************6700');
    await expect(opened.region.getByText('Resultado copiado')).toBeAttached();
  });

  test('warns about the demo key only in incognito and asks for no key', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await openSettingsOnMobile(page, opened);
    await openCodeOnMobile(page, opened);
    const warning = opened.region.getByText(DEMO_KEY_WARNING).filter({
      visible: true,
    });

    await expect(warning).toHaveCount(0);
    await opened.strategy('Incógnito').click();

    await expect(warning).toHaveCount(1);
    await expect(opened.region.getByRole('textbox')).toHaveCount(1);
    await expect(opened.region.locator('input[type="password"]')).toHaveCount(
      0,
    );
    await expect(opened.code).toContainText('process.env.ENMASCARA_HMAC_KEY');
  });

  test('sends nothing, stores nothing and keeps the URL while in use', async ({
    page,
  }) => {
    const opened = await openRing(page);
    const loadedUrl = page.url();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await useEveryControl(page, opened);
    await opened.input.press('ControlOrMeta+A');
    await opened.input.press('ControlOrMeta+V');

    expect(requests).toEqual([]);
    expect(await storedState(page)).toEqual([]);
    expect(page.url()).toBe(loadedUrl);
  });

  test('keeps working offline after it loads', async ({ page, context }) => {
    const opened = await openRing(page);

    await context.setOffline(true);
    await opened.input.fill(`RFC ${RFC}`);

    await expect(opened.output).toHaveText('RFC ***********R8');
  });

  test('writes known XSS payloads as text', async ({ page }) => {
    const opened = await openRing(page);
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    const renderedElements = opened.region.locator(
      '[data-ring-output] *, [data-ring-findings] td *, [data-ring-finding-cards] li > span:last-child *, [data-ring-finding-cards] li > span:first-child > span *',
    );

    for (const payload of XSS_PAYLOADS) {
      await opened.input.fill(payload);
      await expect(opened.output).toHaveText(
        payload.replace(CLABE, '**************6700'),
      );
      await expect(renderedElements).toHaveCount(0);
    }

    expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
    expect(dialogs).toEqual([]);
  });

  test('has no WCAG 2.2 AA violation in any state', async ({ page }) => {
    const opened = await openRing(page);
    expect(await accessibilityViolations(page)).toEqual([]);

    await openSettingsOnMobile(page, opened);
    await openCodeOnMobile(page, opened);
    await opened.strategy('Incógnito').click();
    await opened.copy.click();

    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('shows a visible focus and a 44 px target on every control', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await openSettingsOnMobile(page, opened);
    const tabStops = opened.region.locator(
      'button:visible, input:visible, textarea:visible, summary:visible, [tabindex="0"]:visible',
    );
    const expectedStops = await tabStops.count();
    const unfocused: string[] = [];
    let stops = 0;

    await opened.region.evaluate((region) => {
      region.tabIndex = -1;
      region.focus();
    });
    for (;;) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element?.closest('[data-ring]')) {
          return undefined;
        }
        const style = getComputedStyle(element);
        return {
          name: element.outerHTML.slice(0, 80),
          visible:
            style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
        };
      });
      if (focus === undefined) {
        break;
      }
      stops += 1;
      if (!focus.visible) {
        unfocused.push(focus.name);
      }
    }
    expect(stops).toBe(expectedStops);
    expect(unfocused).toEqual([]);

    const targets = opened.region.locator(
      'button:visible, input:visible, textarea:visible, summary:visible',
    );
    for (const control of await targets.all()) {
      const target = await control.evaluate((element) => {
        const box = (
          element.closest('label') ?? element
        ).getBoundingClientRect();
        return { width: box.width, height: box.height };
      });
      expect(target.width).toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
      expect(target.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
    }
  });

  test('stacks its parts without empty space on mobile', async ({ page }) => {
    const opened = await openRing(page);
    const parts = [
      opened.input,
      opened.output,
      opened.region.getByRole('heading', { name: 'Hallazgos' }),
    ];
    const boxes = await Promise.all(parts.map((part) => part.boundingBox()));

    const gaps = boxes.slice(1).map((box, index) => {
      const previous = boxes[index];
      if (box === null || previous === null || previous === undefined) {
        throw new Error('a part of the ring is not rendered');
      }
      return box.y - (previous.y + previous.height);
    });

    if (isMobile(page)) {
      for (const gap of gaps) {
        expect(gap).toBeLessThan(MAXIMUM_STACK_GAP);
      }
    }
  });

  test('folds the settings on mobile only', async ({ page }) => {
    const opened = await openRing(page);

    if (isMobile(page)) {
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'false');
      await expect(opened.settings).toContainText(
        'Media máscara · CLABE, CURP, RFC, Tarjeta',
      );
      await expect(opened.strategy('Incógnito')).toBeHidden();
      await opened.settings.click();
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'true');
      await opened.type('RFC').uncheck();
      await expect(opened.settings).toContainText(
        'Media máscara · CLABE, CURP, Tarjeta',
      );
      await page.keyboard.press('Escape');
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'false');
      await expect(opened.settings).toBeFocused();
    } else {
      await expect(opened.settings).toBeHidden();
      await expect(opened.strategy('Incógnito')).toBeVisible();
      await expect(opened.code).toBeVisible();
    }
  });
});

test.describe('the compact ring on the home page', () => {
  test('loads the package only when it scrolls into view', async ({ page }) => {
    const width = page.viewportSize()?.width ?? MOBILE_WIDTH;
    await page.setViewportSize({ width, height: SHORT_VIEWPORT_HEIGHT });
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        scripts.push(request.url());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scriptsBeforeView = scripts.length;

    const compact = page.getByRole('region', { name: 'El ring', exact: true });
    await compact.scrollIntoViewIfNeeded();
    await expect(compact).toHaveAttribute('data-ring-ready', 'true');

    expect(scripts.length).toBeGreaterThan(scriptsBeforeView);
    await compact
      .getByRole('textbox', { name: 'Tu log' })
      .fill(`SPEI a ${CLABE}`);
    const output = compact.getByRole('status', { name: 'Resultado' });
    await expect(output).toHaveText('SPEI a **************6700');
    await expect(compact.locator('[data-ring-summary]')).toHaveText(
      '1 dato enmascarado',
    );
    await compact.getByRole('button', { name: 'Máscara completa' }).click();
    await expect(output).toHaveText('SPEI a [CLABE]');
    await expect(
      compact.getByRole('button', { name: 'Incógnito' }),
    ).toHaveCount(0);
  });
});
