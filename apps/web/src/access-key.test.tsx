import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

// Validador de chave de acesso (NF-e e NFC-e). Chaves fictícias.

const VALID = '35261111222333000181550010000001231482719344';
const ALPHA = '35260812ABC34501DE35550010000001231482719348';

async function typeKey(value: string, locale: 'pt-BR' | 'en' = 'pt-BR') {
  renderApp('/tools/access-key-validator', locale);
  const input = await screen.findByLabelText(locale === 'en' ? 'Access key' : 'Chave de acesso');
  fireEvent.change(input, { target: { value } });
  return input as HTMLInputElement;
}

const row = (name: RegExp | string) =>
  screen.getByRole('rowheader', { name }).closest('tr') as HTMLTableRowElement;

describe('Validador de chave de acesso', () => {
  it('chave válida: status, chave formatada e campos com significado', async () => {
    await typeKey(VALID);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Chave de acesso coerente');
    expect(within(status).getByText('NF-e')).toBeInTheDocument();
    expect(
      screen.getByText('3526 1111 2223 3300 0181 5500 1000 0001 2314 8271 9344'),
    ).toBeInTheDocument();
    expect(within(row('UF (cUF)')).getByText('SP')).toBeInTheDocument();
    expect(within(row(/Ano e mês/)).getByText('11/2026')).toBeInTheDocument();
    expect(within(row(/emitente/)).getByText('CNPJ 11.222.333/0001-81')).toBeInTheDocument();
    expect(within(row(/Forma de emissão/)).getByText('Emissão normal')).toBeInTheDocument();
    expect(within(row(/Número/)).getByText('123')).toBeInTheDocument();
    expect(within(row(/Número/)).getByText('26–34')).toBeInTheDocument();
  });

  it('avisa que validar não é autorização da SEFAZ', async () => {
    await typeKey(VALID);
    expect(
      screen.getByText(/não comprova que a nota existe nem que foi autorizada/),
    ).toBeInTheDocument();
  });

  it('CNPJ alfanumérico ganha selo', async () => {
    await typeKey(ALPHA);
    expect(within(screen.getByRole('status')).getByText('CNPJ alfanumérico')).toBeInTheDocument();
  });

  it('DV errado lista o problema, marca a linha e mostra o esperado', async () => {
    await typeKey(`${VALID.slice(0, 43)}5`);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('1 problema na chave:');
    expect(status).toHaveTextContent(
      'Dígito verificador (cDV): O dígito verificador não confere. Esperado 4, informado 5.',
    );
    const dv = row(/Dígito verificador/);
    expect(dv).toHaveClass('st-row--danger');
    expect(dv).toHaveTextContent('Esperado 4');
    expect(row('UF (cUF)')).not.toHaveClass('st-row--danger');
  });

  it('vários erros aparecem juntos', async () => {
    // UF 99 e cNF 12345678, com o DV recalculado para ficar certo.
    await typeKey('99261111222333000181550010000001231123456784');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('2 problemas na chave:');
    expect(status).toHaveTextContent('O código de UF 99 não existe');
    expect(status).toHaveTextContent('O código numérico 12345678 é proibido');
  });

  it('tamanho errado não mostra a tabela', async () => {
    await typeKey('3526');
    expect(screen.getByRole('status')).toHaveTextContent(
      'A chave de acesso tem 44 caracteres. Foram informados 4.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('aviso aparece separado e não invalida a chave', async () => {
    // CNPJ alfanumérico com AAMM 2606, antes da produção (julho de 2026).
    await typeKey('35260612ABC34501DE35550010000001231482719340');
    expect(screen.getByRole('status')).toHaveTextContent('Chave de acesso coerente');
    expect(
      screen.getByText(/só é aceito nos documentos fiscais a partir de julho de 2026/),
    ).toBeInTheDocument();
  });

  it('tpEmis 3 aparece como Regime Especial NFF, sem aviso', async () => {
    await typeKey('35261111222333000181550010000001233482719340');
    expect(
      within(row(/Forma de emissão/)).getByText('Regime Especial NFF (NT 2021.002)'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Atenção')).not.toBeInTheDocument();
  });

  it('em inglês, erros e campos saem em inglês', async () => {
    await typeKey(`${VALID.slice(0, 43)}5`, 'en');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check digit (cDV): The check digit does not match. Expected 4, got 5.',
    );
    expect(screen.getByRole('table', { name: 'Key fields' })).toBeInTheDocument();
  });

  it('Exemplo gera chave fictícia válida e Limpar zera tudo', async () => {
    const user = userEvent.setup();
    renderApp('/tools/access-key-validator');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    const input = screen.getByLabelText('Chave de acesso') as HTMLInputElement;
    expect(input.value).toMatch(/^\d{44}$/);
    expect(screen.getByRole('status')).toHaveTextContent('Chave de acesso coerente');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(input.value).toBe('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('aparece na busca por "chave"', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'chave de acesso');
    expect(
      await screen.findByRole('option', { name: /Validador de chave de acesso/ }),
    ).toBeInTheDocument();
  });
});
