import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hasIcon } from './components/Icon';
import { STORAGE_PREFIX } from './lib/storage';
import { TOOL_COMPONENTS, registry } from './registry';
import { renderApp } from './test-utils';

describe('Registro x componentes', () => {
  it('toda ferramenta disponível tem componente, e todo componente tem ferramenta', () => {
    const available = registry
      .available()
      .map((t) => t.id)
      .sort();
    expect(Object.keys(TOOL_COMPONENTS).sort()).toEqual(available);
  });

  it('todos os ícones do catálogo existem no mapa de ícones', () => {
    for (const t of registry.all()) expect(hasIcon(t.icon), t.icon).toBe(true);
  });
});

describe('Navegação', () => {
  it('renderiza a home sem login com o título do produto', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Menos tarefas repetitivas.',
    );
    expect(screen.getAllByRole('link', { name: /Formatador de JSON/ }).length).toBeGreaterThan(0);
  });

  it('abre ferramenta por URL direta e atualiza o título da página', async () => {
    renderApp('/tools/json-formatter');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Formatador de JSON' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Formatador de JSON · Sakura Tools'));
  });

  it('slug desconhecido mostra 404', async () => {
    renderApp('/tools/nao-existe');
    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument();
  });

  it('ferramenta planejada não é apresentada como funcional', async () => {
    renderApp('/tools/nfe-viewer');
    expect(
      await screen.findByText(/está planejada e ainda não foi implementada/),
    ).toBeInTheDocument();
  });

  it('abre páginas institucionais', async () => {
    renderApp('/pricing');
    expect(await screen.findByText(/Nenhum pagamento é aceito hoje/)).toBeInTheDocument();
  });

  it('renderiza em inglês', async () => {
    renderApp('/', 'en');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Fewer repetitive tasks.',
    );
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('Busca global (Ctrl+K)', () => {
  it('abre com o atalho, filtra sem acento e navega com Enter', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await user.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('combobox');
    await user.type(input, 'cnpj');
    const list = screen.getByRole('listbox');
    // O validador de chave de acesso também aparece, porque fala de CNPJ alfanumérico.
    const options = within(list).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Validador de CNPJ');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Validador de CNPJ'),
      expect.stringContaining('Validador de chave de acesso'),
    ]);
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Validador de CNPJ' }),
    ).toBeInTheDocument();
  });

  it('mostra mensagem quando nada é encontrado', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Buscar ferramentas/ }));
    await user.type(await screen.findByRole('combobox'), 'xyzxyz');
    expect(screen.getByText('Nenhuma ferramenta encontrada.')).toBeInTheDocument();
  });
});

describe('Favoritos e recentes', () => {
  it('favorita uma ferramenta, mostra na sidebar e persiste só o ID', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    await user.click(await screen.findByRole('button', { name: 'Adicionar aos favoritos' }));
    expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}favorites`)!)).toEqual(['base64']);
    expect(
      within(screen.getByRole('navigation', { name: 'Ferramentas' })).getByRole('heading', {
        name: 'Favoritos',
      }),
    ).toBeInTheDocument();
  });

  it('registra recentes sem guardar o conteúdo digitado', async () => {
    const user = userEvent.setup();
    renderApp('/tools/json-formatter');
    await user.type(await screen.findByLabelText('JSON de entrada'), 'segredo-123');
    const stored = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k))
      .join(' ');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}recents`)!)).toEqual([
      'json-formatter',
    ]);
    expect(stored).not.toContain('segredo-123');
  });

  it('não quebra com dados corrompidos no storage', async () => {
    localStorage.setItem(`${STORAGE_PREFIX}favorites`, '{não é json');
    localStorage.setItem(`${STORAGE_PREFIX}recents`, '[1,2,3]');
    renderApp('/');
    expect(
      await screen.findByText('Marque ferramentas com a estrela para encontrá-las aqui.'),
    ).toBeInTheDocument();
  });
});

describe('Ferramentas', () => {
  it.each(registry.available().map((t) => [t.slug]))('%s renderiza sem erro', async (slug) => {
    renderApp(`/tools/${slug}`);
    await screen.findByRole('heading', { level: 1 });
    // espera o chunk lazy carregar e garante que o error boundary não disparou
    await waitFor(() =>
      expect(screen.queryByText('Carregando ferramenta…')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/erro inesperado/)).not.toBeInTheDocument();
  });

  it('JSON: formata e mostra erro com linha', async () => {
    const user = userEvent.setup();
    renderApp('/tools/json-formatter');
    const input = await screen.findByLabelText('JSON de entrada');
    await user.click(input);
    await user.paste('{"a":1}');
    await user.click(screen.getByRole('button', { name: 'Formatar' }));
    expect(await screen.findByLabelText('Resultado')).toHaveValue('{\n  "a": 1\n}');
    await user.clear(input);
    await user.paste('{"a":}');
    await user.click(screen.getByRole('button', { name: 'Formatar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Linha 1, coluna 6/);
  });

  it('XML: recusa DOCTYPE', async () => {
    const user = userEvent.setup();
    renderApp('/tools/xml-formatter');
    await user.click(await screen.findByLabelText('XML de entrada'));
    await user.paste('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>');
    await user.click(screen.getByRole('button', { name: 'Formatar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/DOCTYPE/);
  });

  it('CPF: valida e avisa que dígito não comprova existência', async () => {
    const user = userEvent.setup();
    renderApp('/tools/cpf-validator');
    expect(await screen.findByText(/não comprova que o CPF existe/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('CPF'), '52998224725');
    expect(screen.getByRole('status')).toHaveTextContent('529.982.247-25');
  });

  it('CNPJ: gera números de teste válidos', async () => {
    const user = userEvent.setup();
    renderApp('/tools/cnpj-validator');
    await user.click(await screen.findByRole('button', { name: 'Gerar' }));
    const out = screen.getByLabelText('Gerados (dados de teste)') as HTMLTextAreaElement;
    expect(out.value.split('\n')).toHaveLength(5);
  });

  it('JWT: deixa claro que a assinatura não foi verificada', async () => {
    const user = userEvent.setup();
    renderApp('/tools/jwt-decoder');
    expect(await screen.findByText('Decodificar não é validar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(await screen.findByText('Assinatura não verificada')).toBeInTheDocument();
    expect((screen.getByLabelText('Payload') as HTMLTextAreaElement).value).toContain('John Doe');
  });

  it('Regex: lista matches (fallback sem Worker no jsdom)', async () => {
    const user = userEvent.setup();
    renderApp('/tools/regex-tester');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(await screen.findByText('2 match(es).')).toBeInTheDocument();
  });

  it('Senha: gera senha e mostra entropia', async () => {
    renderApp('/tools/password-generator');
    expect(await screen.findByText(/Entropia: \d+(\.\d)? bits/)).toBeInTheDocument();
  });
});
