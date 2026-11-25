import { contrastRatio, parseColor } from '@sakura-tools/tools/color';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './test-utils';

// Regressões da revisão de UI/UX do Codex (25/11/2026).

const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLTextAreaElement).value;

describe('Resultado some quando a entrada muda', () => {
  it('Base64: editar a entrada esconde o resultado anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    const input = await screen.findByLabelText('Entrada');
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(valueOf('Resultado')).toBe('YWJj');
    await user.type(input, 'd');
    expect(screen.queryByLabelText('Resultado')).not.toBeInTheDocument();
  });

  it('Base64: trocar URL-safe esconde o resultado anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    await user.type(await screen.findByLabelText('Entrada'), '??>>');
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(screen.getByLabelText('Resultado')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /URL-safe/ }));
    expect(screen.queryByLabelText('Resultado')).not.toBeInTheDocument();
  });

  it('Base64: erro some ao corrigir a entrada', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    const input = await screen.findByLabelText('Entrada');
    await user.type(input, 'abc$');
    await user.click(screen.getByRole('button', { name: 'Decodificar' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.type(input, '{Backspace}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('URL: trocar o modo esconde o resultado anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/url-encoder');
    await user.type(await screen.findByLabelText('Entrada'), 'a b/c');
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(valueOf('Resultado')).toBe('a%20b%2Fc');
    await user.click(screen.getByRole('radio', { name: 'URL completa' }));
    expect(screen.queryByLabelText('Resultado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(valueOf('Resultado')).toBe('a%20b/c');
  });

  it('JSON: editar ou trocar indentação esconde o resultado anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/json-formatter');
    const input = await screen.findByLabelText('JSON de entrada');
    await user.click(input);
    await user.paste('{"a":1}');
    await user.click(screen.getByRole('button', { name: 'Formatar' }));
    expect(screen.getByLabelText('Resultado')).toBeInTheDocument();
    await user.type(input, ' ');
    expect(screen.queryByLabelText('Resultado')).not.toBeInTheDocument();
    expect(screen.queryByText('JSON válido.')).not.toBeInTheDocument();
  });

  it('Diff: trocar o modo ou editar o texto esconde o diff anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/text-diff');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByLabelText('Diferenças')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Palavras' }));
    expect(screen.queryByLabelText('Diferenças')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByLabelText('Diferenças')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Texto alterado'), 'x');
    expect(screen.queryByLabelText('Diferenças')).not.toBeInTheDocument();
  });
});

describe('QR Code', () => {
  it('erro aparece também no modo Wi-Fi', async () => {
    const user = userEvent.setup();
    renderApp('/tools/qr-code');
    await user.click(await screen.findByRole('radio', { name: 'Wi-Fi' }));
    fireEvent.change(screen.getByLabelText('Nome da rede (SSID)'), {
      target: { value: 'x'.repeat(3000) },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/grande demais/);
    expect(screen.queryByText('Preencha o conteúdo para gerar.')).not.toBeInTheDocument();
  });

  it('erro aparece no modo texto', async () => {
    renderApp('/tools/qr-code');
    await screen.findByRole('img', { name: 'QR Code gerado' });
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'y'.repeat(3000) } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/grande demais/);
  });

  it('enquanto gera, diz que está gerando e não pede para preencher', async () => {
    renderApp('/tools/qr-code');
    await screen.findByRole('img', { name: 'QR Code gerado' });
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'novo' } });
    expect(screen.getByText('Gerando QR Code…')).toBeInTheDocument();
    expect(screen.queryByText('Preencha o conteúdo para gerar.')).not.toBeInTheDocument();
    await screen.findByRole('img', { name: 'QR Code gerado' });
  });
});

describe('Botões de copiar com nome distinto', () => {
  it('cada hash tem seu próprio "Copiar …" para leitor de tela', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    for (const alg of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) {
      expect(await screen.findByRole('button', { name: `Copiar ${alg}` })).toBeInTheDocument();
    }
  });

  it('saídas em bloco também dizem o que copiam', async () => {
    const user = userEvent.setup();
    renderApp('/tools/jwt-decoder');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(screen.getByRole('button', { name: 'Copiar Header' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar Payload' })).toBeInTheDocument();
  });
});

describe('Contraste do rosa da marca usado como texto', () => {
  const css = readFileSync(resolve(process.cwd(), 'apps/web/src/styles/app.css'), 'utf8');
  const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf("[data-theme='dark']"));
  const brand = /--st-brand-text:\s*(#[0-9a-f]{6})/i.exec(lightBlock)?.[1];

  it('no tema claro passa de 4,5:1 no fundo e na sidebar', () => {
    expect(brand).toBeDefined();
    const fg = parseColor(brand!)!;
    expect(contrastRatio(fg, parseColor('#fbf8fa')!)).toBeGreaterThanOrEqual(4.5); // --sk-bg
    expect(contrastRatio(fg, parseColor('#f6eef2')!)).toBeGreaterThanOrEqual(4.5); // --st-bg-2
  });

  it('logo e gradiente do título usam o token de texto, não o primary', () => {
    expect(css).toMatch(/\.st-logo em \{[^}]*color: var\(--st-brand-text\)/);
    expect(css).toMatch(/linear-gradient\(90deg, var\(--st-brand-text\)/);
  });
});

describe('Movimento reduzido', () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });

  function mockMotion(reduce: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  it.each([
    [true, 'auto'],
    [false, 'smooth'],
  ])('reduzido=%s rola com behavior %s', async (reduce, behavior) => {
    mockMotion(reduce);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Explorar ferramentas/ }));
    expect(scroll).toHaveBeenCalledWith({ behavior });
  });
});

describe('Textos fixos traduzidos', () => {
  it('UUID e rodapé em inglês', async () => {
    renderApp('/tools/uuid-generator', 'en');
    expect(await screen.findByRole('radio', { name: 'v4 (random)' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
  });

  it('UUID e rodapé em português', async () => {
    renderApp('/tools/uuid-generator');
    expect(await screen.findByRole('radio', { name: 'v4 (aleatório)' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Rodapé' })).toBeInTheDocument();
  });
});
