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
  'access-key-validator',
  'nfe-viewer',
  'rejection-codes',
  'nfe-compare',
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
    // Logo do cabeçalho carregada (imagem quebrada tem naturalWidth 0).
    const logo = page.locator('.st-logo img').first();
    await expect
      .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect(w.problems).toEqual([]);
  });

  test('favicons declarados existem e são imagens', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(['/favicon.ico', '/favicon-192.png', '/apple-touch-icon.png']);
    for (const href of hrefs) {
      const res = await request.get(href!);
      expect(res.status(), href!).toBe(200);
      const body = await res.body();
      // ICO começa com 00 00 01 00; PNG com 89 50 4E 47.
      const magic = body.subarray(0, 4).toString('hex');
      expect(magic, href!).toBe(href!.endsWith('.ico') ? '00000100' : '89504e47');
    }
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
      // O corpo da ferramenta carrega depois do título (lazy). Checar visibilidade
      // na hora pulava o exemplo e deixava os botões desabilitados (teste instável).
      if (slug === 'password-generator') {
        await expect(page.getByRole('button', { name: 'Restaurar padrões' })).toBeVisible();
      } else {
        await page.getByRole('button', { name: 'Exemplo' }).first().click();
      }
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

test.describe('visualizador de NF-e', () => {
  const fixture = (nNF: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe00000000000000000000000000000000000000000000" versao="4.00"><ide><nNF>${nNF}</nNF><mod>55</mod><tpAmb>2</tpAmb></ide><emit><xNome>EMPRESA FICTICIA</xNome></emit></infNFe></NFe>`;

  test('exemplo lido no Web Worker real, abas e sem rolagem horizontal', async ({ page }) => {
    const w = watch(page);
    const workers: string[] = [];
    page.on('worker', (wk) => workers.push(wk.url()));
    await page.goto('/tools/nfe-viewer');
    await page.getByRole('button', { name: 'Exemplo' }).click();
    const region = page.getByRole('region', { name: 'Nota lida' });
    await expect(region).toContainText('NF-e com protocolo (nfeProc)');
    expect(workers.some((u) => u.includes('nfe.worker'))).toBe(true);
    for (const tab of ['Itens (2)', 'Totais', 'Transporte e pagamento', 'Protocolo', 'XML']) {
      await page.getByRole('tab', { name: tab }).click();
      expect(await hasHorizontalScroll(page), tab).toBe(false);
    }
    await expect(page.getByLabel('XML formatado', { exact: true })).toHaveValue(/<infNFe/);
    expect(w.problems).toEqual([]);
    expect(w.external).toEqual([]);
  });

  test('arquivo enviado pelo seletor mostra o problema da chave', async ({ page }) => {
    await page.goto('/tools/nfe-viewer');
    await page.locator('#nfe-file').setInputFiles({
      name: 'nota.xml',
      mimeType: 'application/xml',
      buffer: Buffer.from(fixture('7')),
    });
    await expect(page.getByText('nota.xml')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Nota lida' })).toContainText(
      'Problemas encontrados',
    );
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`nota lida no tema ${theme} sem violações sérias`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('sakura-tools-theme', t), theme);
      await page.goto('/tools/nfe-viewer');
      await page.getByRole('button', { name: 'Exemplo' }).click();
      await expect(page.getByRole('region', { name: 'Nota lida' })).toBeVisible();
      await page.getByRole('tab', { name: 'Itens (2)' }).click();
      await page.getByRole('button', { name: /Item 1 ·/ }).click();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
      expect(serious).toEqual([]);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }
});

test.describe('rotas e ferramentas fiscais', () => {
  test('/tools/ de ferramenta fiscal vai para /fiscal/ e /fiscal/nfce-viewer abre o visualizador', async ({
    page,
  }) => {
    await page.goto('/tools/rejection-codes');
    await expect(page).toHaveURL(/\/fiscal\/rejection-codes$/);
    await page.goto('/fiscal/nfce-viewer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Visualizador de NF-e e NFC-e',
    );
  });

  // A fonte do sistema muda de largura entre Windows e Linux. Com uma fonte larga
  // forçada, o seletor de quatro opções precisa quebrar linha em vez de vazar.
  test('seletores de opção não vazam da tela com fonte larga', async ({ page }) => {
    for (const path of ['/fiscal/rejection-codes', '/fiscal/nfe-compare']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.addStyleTag({
        content: '* { font-family: "DejaVu Sans", Verdana, sans-serif !important; }',
      });
      if (path.endsWith('nfe-compare')) {
        await page.getByRole('button', { name: 'Exemplo' }).click();
        await expect(page.getByRole('region', { name: 'Diferenças' })).toContainText(
          '3 diferença(s)',
        );
      } else {
        await expect(page.getByRole('radiogroup', { name: 'Tipo' })).toBeVisible();
      }
      expect(await hasHorizontalScroll(page), path).toBe(false);
    }
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`comparador e rejeições com resultado no tema ${theme}: sem rolagem e sem violações sérias`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem('sakura-tools-theme', t), theme);
      const axe = async () => {
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        return results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
      };
      await page.goto('/fiscal/nfe-compare');
      await page.getByRole('button', { name: 'Exemplo' }).click();
      await expect(page.getByRole('region', { name: 'Diferenças' })).toContainText(
        '3 diferença(s)',
      );
      expect(await hasHorizontalScroll(page)).toBe(false);
      expect(await axe()).toEqual([]);

      await page.goto('/fiscal/rejection-codes');
      await page.getByLabel('Código ou texto').fill('duplicidade');
      await expect(page.getByRole('table')).toContainText('204');
      expect(await hasHorizontalScroll(page)).toBe(false);
      expect(await axe()).toEqual([]);
    });
  }
});

test.describe('chave de acesso', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`chave com erros no tema ${theme}: tabela marcada, sem rolagem e sem violações sérias`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem('sakura-tools-theme', t), theme);
      await page.goto('/tools/access-key-validator');
      // UF 99, cNF fraco e DV errado (chave fictícia).
      await page
        .getByLabel('Chave de acesso')
        .fill('9926 1111 2223 3300 0181 5500 1000 0001 2311 2345 6780');
      await expect(page.getByRole('status')).toContainText('3 problemas na chave:');
      await expect(page.locator('tr.st-row--danger')).toHaveCount(3);
      expect(await hasHorizontalScroll(page)).toBe(false);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
      expect(serious).toEqual([]);
    });
  }
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

  test('menu aberto é modal: Tab não sai do menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () =>
          !!document.activeElement?.closest('#st-sidebar') ||
          document.activeElement === document.body,
      );
      expect(inside, `Tab ${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await page.evaluate(
        () =>
          !!document.activeElement?.closest('#st-sidebar') ||
          document.activeElement === document.body,
      );
      expect(inside, `Shift+Tab ${i + 1}`).toBe(true);
    }
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
      '/tools/access-key-validator',
      '/fiscal/nfe-viewer',
      '/fiscal/rejection-codes',
      '/fiscal/nfe-compare',
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
