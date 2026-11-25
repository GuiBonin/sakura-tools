import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TOOLS = [
  'json-formatter',
  'xml-formatter',
  'base64',
  'url-encoder',
  'uuid-generator',
  'password-generator',
  'color-converter',
  'regex-tester',
  'text-diff',
  'unix-timestamp',
  'qr-code',
  'hash-generator',
  'jwt-decoder',
  'cpf-validator',
  'cnpj-validator',
];

/** Erros de console e de página, e requisições para fora do próprio app. */
function watch(page: Page) {
  const problems: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) {
      external.push(r.url());
    }
  });
  return { problems, external };
}

async function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

test.describe('build de produção', () => {
  test('home carrega com CSP e sem erros', async ({ page }) => {
    const w = watch(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Menos tarefas repetitivas.',
    );
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("connect-src 'self'");
    expect(w.problems).toEqual([]);
  });
});

test.describe('todas as ferramentas', () => {
  for (const slug of TOOLS) {
    test(`${slug}: abre, usa o exemplo, sem erro, sem rolagem horizontal e sem rede externa`, async ({
      page,
    }) => {
      const w = watch(page);
      await page.goto(`/tools/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const example = page.getByRole('button', { name: 'Exemplo' }).first();
      if (await example.isVisible()) await example.click();
      for (const name of ['Formatar', 'Comparar', 'Codificar']) {
        const btn = page.getByRole('button', { name, exact: true });
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }
      await page.waitForTimeout(400);
      expect(await hasHorizontalScroll(page)).toBe(false);
      expect(w.problems).toEqual([]);
      expect(w.external).toEqual([]);
    });
  }
});

test.describe('regex no Web Worker real', () => {
  test('expressão catastrófica é interrompida e a página continua respondendo', async ({
    page,
  }) => {
    await page.goto('/tools/regex-tester');
    await page.getByLabel('Texto de teste').fill('a'.repeat(40) + '!');
    await page.getByLabel('Expressão regular').fill('(a+)+$');
    // Enquanto o worker trava, a thread principal precisa seguir livre.
    const ticks = await page.evaluate(async () => {
      let n = 0;
      const id = setInterval(() => n++, 100);
      await new Promise((r) => setTimeout(r, 1000));
      clearInterval(id);
      return n;
    });
    expect(ticks).toBeGreaterThanOrEqual(8);
    await expect(page.getByText(/foi interrompida/)).toBeVisible({ timeout: 5000 });
  });

  test('execução normal encontra os matches', async ({ page }) => {
    await page.goto('/tools/regex-tester');
    await page.getByRole('button', { name: 'Exemplo' }).click();
    await expect(page.getByText('2 match(es).')).toBeVisible();
  });
});

test.describe('QR Code', () => {
  test('baixa PNG válido gerado no navegador', async ({ page }) => {
    await page.goto('/tools/qr-code');
    await expect(page.getByRole('img', { name: 'QR Code gerado' })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('qrcode.png');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const bytes = Buffer.concat(chunks);
    // Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'só no desktop');

  test('Ctrl+K abre a busca e Enter navega', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('cnpj');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tools\/cnpj-validator$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Validador de CNPJ');
  });

  test('favorito persiste depois de recarregar', async ({ page }) => {
    await page.goto('/tools/base64');
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Favoritos' }).first()).toBeVisible();
  });
});

test.describe('celular (375 px)', () => {
  test.skip(({ isMobile }) => !isMobile, 'só no celular');

  test('menu: abre com foco, Escape fecha e devolve o foco', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Abrir menu' });
    await trigger.click();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('menu: navegar por um link fecha o menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.locator('#st-sidebar').getByRole('link', { name: 'Formatador de XML' }).click();
    await expect(page).toHaveURL(/xml-formatter/);
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('controles do app têm pelo menos 44 px de altura', async ({ page }) => {
    await page.goto('/tools/url-encoder');
    const heights = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.st-segmented__item, .st-footer nav a, .st-search-trigger, .st-icon-link',
        ),
      ].map((el) => Math.round(el.getBoundingClientRect().height)),
    );
    expect(heights.length).toBeGreaterThan(5);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });

  test('páginas institucionais sem rolagem horizontal', async ({ page }) => {
    for (const path of ['/', '/pricing', '/roadmap', '/settings', '/privacy', '/terms', '/nada']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page), path).toBe(false);
    }
  });
});

test.describe('acessibilidade (axe)', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const path of [
      '/',
      '/tools/json-formatter',
      '/tools/qr-code',
      '/tools/hash-generator',
      '/tools/cnpj-validator',
      '/pricing',
    ]) {
      test(`${path} no tema ${theme} sem violações sérias`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('sakura-tools-theme', t), theme);
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const serious = results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
        expect(serious).toEqual([]);
      });
    }
  }
});
