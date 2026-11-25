import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, test } from '@playwright/test';

declare global {
  interface Window {
    policyViolations: string[];
  }
}

const PAGES = ['/', '/docs/', '/404.html'];
const THEMES = ['light', 'dark'];
const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];
const ALLOWED_STORAGE_KEYS = ['localStorage:starlight-theme'];
const INK_BACKGROUND = 'rgb(22, 19, 28)';

interface Watched {
  readonly foreignRequests: string[];
}

async function watch(page: Page): Promise<Watched> {
  const watched: Watched = { foreignRequests: [] };
  await page.addInitScript(() => {
    window.policyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.policyViolations.push(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  const siteOrigin = new URL(String(test.info().project.use.baseURL)).origin;
  page.on('request', (request: Request) => {
    const { origin, protocol } = new URL(request.url());
    if (protocol !== 'data:' && origin !== siteOrigin) {
      watched.foreignRequests.push(request.url());
    }
  });
  return watched;
}

async function visit(page: Page, path: string): Promise<Watched> {
  const watched = await watch(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  return watched;
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

async function storedKeys(page: Page): Promise<readonly string[]> {
  return page.evaluate(async () => [
    ...Object.keys(localStorage).map((key) => `localStorage:${key}`),
    ...Object.keys(sessionStorage).map((key) => `sessionStorage:${key}`),
    ...(await indexedDB.databases()).map(({ name }) => `indexedDB:${name}`),
  ]);
}

async function expectPrivateAndSafe(
  page: Page,
  watched: Watched,
): Promise<void> {
  expect(watched.foreignRequests).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
  expect(await page.evaluate(() => window.policyViolations)).toEqual([]);
  expect(
    (await storedKeys(page)).filter(
      (key) => !ALLOWED_STORAGE_KEYS.includes(key),
    ),
  ).toEqual([]);
}

for (const path of PAGES) {
  test.describe(`page ${path}`, () => {
    test('has no WCAG 2.2 AA violation', async ({ page }) => {
      await visit(page, path);

      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('talks only to its own origin and stores nothing but the theme', async ({
      page,
    }) => {
      const watched = await visit(page, path);

      await expectPrivateAndSafe(page, watched);
    });

    test('fits the viewport without horizontal scrolling', async ({ page }) => {
      await visit(page, path);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
  });
}

test.describe('home page', () => {
  test('shows the design header and the display font', async ({ page }) => {
    await visit(page, '/');

    const navigation = page.getByRole('navigation', { name: 'Principal' });
    await expect(
      navigation.getByRole('link', { name: 'enmascara' }),
    ).toHaveAttribute('href', '/');
    await expect(
      navigation.getByRole('link', { name: 'Documentación' }),
    ).toHaveAttribute('href', '/docs/');
    await expect(page.locator('header')).toHaveCSS(
      'background-color',
      INK_BACKGROUND,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS(
      'font-family',
      /^Anton/,
    );
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready;
        return ['Anton', 'IBM Plex Sans'].map((family) =>
          document.fonts.check(`16px "${family}"`),
        );
      }),
    ).toEqual([true, true]);
  });
});

test.describe('documentation', () => {
  for (const theme of THEMES) {
    test(`has no WCAG 2.2 AA violation in the ${theme} theme`, async ({
      page,
    }) => {
      await page.addInitScript((chosen) => {
        localStorage.setItem('starlight-theme', chosen);
      }, theme);
      const watched = await visit(page, '/docs/');

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await accessibilityViolations(page)).toEqual([]);
      await expectPrivateAndSafe(page, watched);
    });
  }

  test('searches without leaving the origin or breaking the policy', async ({
    page,
  }) => {
    const watched = await visit(page, '/docs/');

    await page
      .getByRole('button', { name: /buscar/i })
      .first()
      .click();
    await page.locator('dialog[open] input').fill('CLABE');

    await expect(page.locator('.pagefind-ui__result').first()).toBeVisible();
    await expectPrivateAndSafe(page, watched);
  });
});
