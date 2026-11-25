import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const CI = !!process.env.CI;

/**
 * E2E contra o build de produção (com a CSP real), servido pelo `vite preview`.
 *
 * Localmente usa o Google Chrome já instalado (`channel: 'chrome'`), sem baixar
 * navegador. No CI usa o Chromium do Playwright (`npx playwright install chromium`).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    // O app detecta o idioma do navegador; os testes usam os textos em português.
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'mobile',
      // 375 px: largura de um iPhone SE/mini, a menor tela que o app promete atender.
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview apps/web --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
