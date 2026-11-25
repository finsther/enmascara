import { defineConfig, devices } from '@playwright/test';

const { CI: continuousIntegration } = process.env;
const BASE_URL_OPTION = 'baseURL';
const PREVIEW_PORT = 4321;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  forbidOnly: continuousIntegration !== undefined,
  reporter: 'list',
  use: { [BASE_URL_OPTION]: PREVIEW_URL },
  webServer: {
    command: `pnpm exec astro preview --port ${PREVIEW_PORT} --ignore-lock`,
    url: PREVIEW_URL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE_VIEWPORT },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
  ],
});
