import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './test-utils';

describe('Seletor de opções (radiogroup)', () => {
  it('setas, Home e End mudam a opção e levam o foco junto', async () => {
    const user = userEvent.setup();
    renderApp('/tools/text-diff');
    const lines = await screen.findByRole('radio', { name: 'Linhas' });
    const words = screen.getByRole('radio', { name: 'Palavras' });
    const chars = screen.getByRole('radio', { name: 'Caracteres' });

    lines.focus();
    await user.keyboard('{ArrowRight}');
    expect(words).toHaveAttribute('aria-checked', 'true');
    expect(words).toHaveFocus();

    await user.keyboard('{End}');
    expect(chars).toHaveAttribute('aria-checked', 'true');
    expect(chars).toHaveFocus();

    // volta ao início quando passa do fim
    await user.keyboard('{ArrowDown}');
    expect(lines).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(chars).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Home}');
    expect(lines).toHaveAttribute('aria-checked', 'true');
    expect(lines).toHaveFocus();
  });

  it('só a opção marcada entra no Tab', async () => {
    renderApp('/tools/text-diff');
    const lines = await screen.findByRole('radio', { name: 'Linhas' });
    expect(lines).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Palavras' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Caracteres' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Menu no celular', () => {
  const realMatchMedia = window.matchMedia;

  function mockMobile() {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width: 900px'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  afterEach(() => {
    window.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });

  /** matchMedia controlável: `resize(false)` simula alargar a janela para desktop. */
  function mockResizable() {
    let mobile = true;
    const listeners = new Set<(e: { matches: boolean }) => void>();
    window.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes('max-width: 900px') ? mobile : false;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
        listeners.delete(fn),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    return (next: boolean) =>
      act(() => {
        mobile = next;
        for (const fn of [...listeners]) fn({ matches: next });
      });
  }

  it('alargar a janela com o menu aberto tira o fundo escuro e não reabre ao estreitar', async () => {
    const resize = mockResizable();
    const user = userEvent.setup();
    const { container } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    expect(container.querySelector('.st-backdrop')).toBeInTheDocument();

    resize(false);
    expect(container.querySelector('.st-backdrop')).not.toBeInTheDocument();
    expect(container.querySelector('#st-sidebar')).not.toHaveClass('is-open');
    expect(container.querySelector('#st-sidebar')).not.toHaveAttribute('inert');

    resize(true);
    expect(container.querySelector('.st-backdrop')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('fechado fica inerte; aberto recebe o foco; Escape fecha e devolve o foco', async () => {
    mockMobile();
    const user = userEvent.setup();
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    const aside = container.querySelector('#st-sidebar')!;
    expect(aside).toHaveAttribute('inert');

    const trigger = screen.getByRole('button', { name: 'Abrir menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(aside).not.toHaveAttribute('inert');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(aside).toHaveAttribute('inert');
    expect(trigger).toHaveFocus();
  });

  it('aberto funciona como modal: o resto da tela fica inerte até fechar', async () => {
    mockMobile();
    const user = userEvent.setup();
    const { container } = renderApp('/');
    const trigger = await screen.findByRole('button', { name: 'Abrir menu' });
    const mainCol = container.querySelector('.st-main-col')!;
    expect(mainCol).not.toHaveAttribute('inert');

    await user.click(trigger);
    expect(mainCol).toHaveAttribute('inert');
    expect(screen.getByText('Pular para o conteúdo')).toHaveAttribute('inert');
    // O botão que abriu o menu também fica inerte enquanto ele está aberto.
    expect(mainCol).toContainElement(trigger);

    await user.keyboard('{Escape}');
    expect(mainCol).not.toHaveAttribute('inert');
    expect(trigger).toHaveFocus();
  });

  it('botão de fechar também devolve o foco', async () => {
    mockMobile();
    const user = userEvent.setup();
    renderApp('/');
    const trigger = await screen.findByRole('button', { name: 'Abrir menu' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Fechar menu' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('no desktop a sidebar nunca fica inerte', async () => {
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('#st-sidebar')).not.toHaveAttribute('inert');
    expect(container.querySelector('.st-main-col')).not.toHaveAttribute('inert');
  });
});
