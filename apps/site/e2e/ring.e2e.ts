import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';
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
const CLABE = '002180032240946700';
const CARD = '4242424242424242';
const CURP = 'BNQF380215XSRHNDD6';
const RFC = 'GODE561231GR8';
const DEMO_KEY_WARNING = /llave de demostración/i;
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

function ring(page: Page) {
  const region = page.getByRole('region', { name: 'El ring' });
  return {
    region,
    input: region.getByRole('textbox', { name: 'Texto de entrada' }),
    output: region.getByRole('status', { name: 'Texto enmascarado' }),
    findings: region.getByRole('table', { name: 'Hallazgos' }),
    code: region.getByRole('region', { name: 'Lo mismo en tu código' }),
    copy: region.getByRole('button', { name: 'Copiar código' }),
    settings: region.getByRole('button', { name: 'Ajustes' }),
    type: (name: string) => region.getByRole('checkbox', { name }),
    strategy: (name: string) => region.getByRole('radio', { name }),
    example: (name: string) => region.getByRole('button', { name }),
  };
}

async function openRing(page: Page) {
  await page.goto(RING_PATH);
  await page.waitForLoadState('networkidle');
  const opened = ring(page);
  await expect(opened.region).toHaveAttribute('data-ring-ready', 'true');
  return opened;
}

async function openSettingsOnMobile(page: Page, settings: Locator) {
  if (page.viewportSize()?.width === MOBILE_WIDTH) {
    await settings.click();
  }
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

async function useEveryControl(page: Page) {
  const opened = ring(page);
  await opened.input.fill(`SPEI a ${CLABE}`);
  await opened.input.press('End');
  await page.keyboard.insertText(`\ntarjeta ${CARD}`);
  await openSettingsOnMobile(page, opened.settings);
  await opened.type('CURP').uncheck();
  await opened.type('CURP').check();
  for (const strategy of ['Media máscara', 'Incógnito', 'Máscara completa']) {
    await opened.strategy(strategy).check();
  }
  for (const example of [
    'Log de transferencias',
    'Payload JSON',
    'Export CSV',
  ]) {
    await opened.example(example).click();
  }
  await opened.copy.click();
}

test.describe('the ring', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('masks a fixture in the browser with the package', async ({ page }) => {
    const opened = await openRing(page);

    await opened.input.fill(`SPEI a ${CLABE}`);

    await expect(opened.output).toHaveText('SPEI a [CLABE]');
  });

  test('masks live with the chosen strategy', async ({ page }) => {
    const opened = await openRing(page);
    await opened.input.fill(`tarjeta ${CARD}`);
    await openSettingsOnMobile(page, opened.settings);

    await opened.strategy('Media máscara').check();
    await expect(opened.output).toHaveText('tarjeta ************4242');

    await opened.strategy('Incógnito').check();
    await expect(opened.output).toHaveText(/^tarjeta \[CARD:[0-9a-f]{6}\]$/);

    await opened.strategy('Máscara completa').check();
    await expect(opened.output).toHaveText('tarjeta [CARD]');
  });

  test('masks only the selected types and keeps at least one', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await opened.input.fill(`${CLABE} ${CARD} ${CURP} ${RFC}`);
    await openSettingsOnMobile(page, opened.settings);

    for (const name of ['Tarjeta', 'CURP', 'RFC']) {
      await opened.type(name).uncheck();
    }

    await expect(opened.output).toHaveText(`[CLABE] ${CARD} ${CURP} ${RFC}`);
    await expect(opened.type('CLABE')).toBeChecked();
    await expect(opened.type('CLABE')).toBeDisabled();
  });

  test('loads each example', async ({ page }) => {
    const opened = await openRing(page);

    await opened.example('Payload JSON').click();

    await expect(opened.input).toHaveValue(/"curp"/);
    await expect(opened.output).toContainText('[CURP]');
    await expect(opened.output).not.toContainText(CURP);
  });

  test('lists the type, line and masked result of each finding', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await openSettingsOnMobile(page, opened.settings);
    await opened.strategy('Media máscara').check();

    await opened.input.fill(`inicio\nSPEI a ${CLABE}\n\ntarjeta ${CARD}`);

    await expect(opened.findings.getByRole('columnheader')).toHaveText([
      'Tipo',
      'Línea',
      'Resultado',
    ]);
    await expect(opened.findings.getByRole('row')).toHaveText([
      'TipoLíneaResultado',
      'CLABE2**************6700',
      'Tarjeta4************4242',
    ]);
  });

  test('never shows a detected value outside the input', async ({ page }) => {
    const opened = await openRing(page);
    const values = validFixtureValues();

    await opened.input.fill(values.join('\n'));
    await expect(opened.findings.getByRole('row')).toHaveCount(
      values.length + 1,
    );

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
    await openSettingsOnMobile(page, opened.settings);
    await opened.input.fill(`SPEI a ${CLABE}`);

    await opened.type('RFC').uncheck();
    await opened.strategy('Media máscara').check();

    await expect(opened.code).toContainText(
      "detect: ['clabe', 'curp', 'card']",
    );
    await expect(opened.code).toContainText("strategy: 'partial'");
    await expect(opened.code).not.toContainText(CLABE);
  });

  test('copies the code to the clipboard', async ({ page }) => {
    const opened = await openRing(page);

    await opened.copy.click();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("import { createRedactor } from 'enmascara';");
    await expect(opened.region.getByText('Código copiado')).toBeVisible();
  });

  test('warns about the demo key only in incognito and asks for no key', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await openSettingsOnMobile(page, opened.settings);

    await expect(opened.region.getByText(DEMO_KEY_WARNING)).toBeHidden();
    await opened.strategy('Incógnito').check();

    await expect(opened.region.getByText(DEMO_KEY_WARNING)).toBeVisible();
    await expect(opened.region.getByRole('textbox')).toHaveCount(1);
    await expect(opened.region.locator('input[type="password"]')).toHaveCount(
      0,
    );
    await expect(opened.code).toContainText('process.env.ENMASCARA_HMAC_KEY');
  });

  test('sends nothing, stores nothing and keeps the URL while in use', async ({
    page,
  }) => {
    await openRing(page);
    const loadedUrl = page.url();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await useEveryControl(page);
    await ring(page).input.press('ControlOrMeta+A');
    await ring(page).input.press('ControlOrMeta+V');

    expect(requests).toEqual([]);
    expect(await storedState(page)).toEqual([]);
    expect(page.url()).toBe(loadedUrl);
  });

  test('keeps working offline after it loads', async ({ page, context }) => {
    const opened = await openRing(page);

    await context.setOffline(true);
    await opened.input.fill(`RFC ${RFC}`);

    await expect(opened.output).toHaveText('RFC [RFC]');
  });

  test('writes known XSS payloads as text', async ({ page }) => {
    const opened = await openRing(page);
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    const elementsBefore = await opened.region.locator('*').count();

    for (const payload of XSS_PAYLOADS) {
      await opened.input.fill(payload);
      await expect(opened.output).toContainText(
        payload.includes(CLABE) ? '[CLABE]' : payload,
      );
    }

    expect(await opened.region.locator('*').count()).toBe(elementsBefore);
    expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
    expect(dialogs).toEqual([]);
  });

  test('has no WCAG 2.2 AA violation in any state', async ({ page }) => {
    const opened = await openRing(page);
    expect(await accessibilityViolations(page)).toEqual([]);

    await openSettingsOnMobile(page, opened.settings);
    await opened.example('Log de transferencias').click();
    await opened.strategy('Incógnito').check();
    await opened.copy.click();

    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('shows a visible focus and a 44 px target on every control', async ({
    page,
  }) => {
    const opened = await openRing(page);
    await openSettingsOnMobile(page, opened.settings);
    const controls = opened.region.locator(
      'button, input, textarea, [tabindex="0"]',
    );

    for (const control of await controls.all()) {
      await control.focus();
      const focus = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return { outline: style.outlineStyle, width: style.outlineWidth };
      });
      expect(focus.outline).not.toBe('none');
      expect(focus.width).not.toBe('0px');

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

  test('folds the settings on mobile only', async ({ page }) => {
    const opened = await openRing(page);
    const isMobile = page.viewportSize()?.width === MOBILE_WIDTH;

    if (isMobile) {
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'false');
      await expect(opened.strategy('Incógnito')).toBeHidden();
      await opened.settings.click();
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'true');
      await expect(opened.strategy('Incógnito')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(opened.settings).toHaveAttribute('aria-expanded', 'false');
      await expect(opened.settings).toBeFocused();
    } else {
      await expect(opened.settings).toBeHidden();
      await expect(opened.strategy('Incógnito')).toBeVisible();
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

    const compact = ring(page);
    await compact.region.scrollIntoViewIfNeeded();
    await expect(compact.region).toHaveAttribute('data-ring-ready', 'true');

    expect(scripts.length).toBeGreaterThan(scriptsBeforeView);
    await compact.input.fill(`SPEI a ${CLABE}`);
    await expect(compact.output).toHaveText('SPEI a [CLABE]');
  });
});
