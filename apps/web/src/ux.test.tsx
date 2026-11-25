import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

// Exemplo, Limpar e outras ações de conveniência.

const inputValue = (label: string | RegExp) =>
  (screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement).value;

describe('Exemplo e Limpar em todas as ferramentas', () => {
  it('Cores', async () => {
    const user = userEvent.setup();
    renderApp('/tools/color-converter');
    await user.click(await screen.findByRole('button', { name: 'Limpar' }));
    expect(inputValue('Cor (HEX, RGB, HSL ou CMYK)')).toBe('');
    expect(screen.queryByText('HEX')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(inputValue('Cor (HEX, RGB, HSL ou CMYK)')).toBe('#D88CA5');
    expect(screen.getByText('#d88ca5')).toBeInTheDocument();
  });

  it.each([
    ['cpf-validator', 'CPF'],
    ['cnpj-validator', 'CNPJ'],
  ])('%s: exemplo é um número fictício válido e Limpar zera tudo', async (slug, label) => {
    const user = userEvent.setup();
    renderApp(`/tools/${slug}`);
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(inputValue(label)).not.toBe('');
    expect(screen.getByRole('status')).toHaveTextContent('Dígitos verificadores corretos');
    await user.click(screen.getByRole('button', { name: 'Gerar' }));
    expect(screen.getByLabelText('Gerados (dados de teste)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(inputValue(label)).toBe('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Gerados (dados de teste)')).not.toBeInTheDocument();
  });

  it('Senha: restaurar padrões volta para 20 caracteres com todos os conjuntos', async () => {
    const user = userEvent.setup();
    renderApp('/tools/password-generator');
    await user.click(await screen.findByRole('checkbox', { name: '!@#$' }));
    expect(screen.getByRole('checkbox', { name: '!@#$' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Restaurar padrões' }));
    expect(screen.getByRole('checkbox', { name: '!@#$' })).toBeChecked();
    expect(screen.getByText('Tamanho: 20')).toBeInTheDocument();
  });

  it('QR Code: exemplo e limpar no modo texto e no Wi-Fi', async () => {
    const user = userEvent.setup();
    renderApp('/tools/qr-code');
    await user.click(await screen.findByRole('button', { name: 'Limpar' }));
    expect(inputValue('Conteúdo')).toBe('');
    expect(screen.getByText('Preencha o conteúdo para gerar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Wi-Fi' }));
    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(inputValue('Nome da rede (SSID)')).toBe('Rede de teste');
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(inputValue('Nome da rede (SSID)')).toBe('');
    expect(inputValue('Senha')).toBe('');
  });

  it('Timestamp: exemplo preenche os dois conversores e Limpar esvazia', async () => {
    const user = userEvent.setup();
    renderApp('/tools/unix-timestamp');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(screen.getByText('2025-11-25T12:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-11-25T17:30:00.000Z')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(inputValue('Timestamp')).toBe('');
    expect(inputValue('Data (ISO 8601)')).toBe('');
    expect(screen.queryByText('ISO 8601 (UTC)')).not.toBeInTheDocument();
  });

  it('UUID: limpar a lista e exemplo/limpar na inspeção', async () => {
    const user = userEvent.setup();
    renderApp('/tools/uuid-generator');
    expect(await screen.findByLabelText('UUIDs gerados')).toBeInTheDocument();
    const [clearList, clearProbe] = screen.getAllByRole('button', { name: 'Limpar' });
    await user.click(clearList!);
    expect(screen.queryByLabelText('UUIDs gerados')).not.toBeInTheDocument();
    expect(clearList).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(screen.getByRole('status')).toHaveTextContent('Versão 7');
    await user.click(clearProbe!);
    expect(inputValue('UUID')).toBe('');
  });

  it('Hash: remover o arquivo escolhido', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('radio', { name: 'Arquivo' }));
    expect(screen.queryByRole('button', { name: 'Remover arquivo' })).not.toBeInTheDocument();
    const input = document.getElementById('hash-file') as HTMLInputElement;
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });
    if (!file.arrayBuffer) {
      Object.assign(file, { arrayBuffer: async () => new TextEncoder().encode('abc').buffer });
    }
    await user.upload(input, file);
    expect(await screen.findByText(/a\.txt/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover arquivo' }));
    expect(screen.queryByText(/a\.txt/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ou arraste um arquivo aqui/)).toBeInTheDocument();
    expect(input.value).toBe('');
  });
});

describe('Copiar o diff', () => {
  it('copia em texto com + e - por linha', async () => {
    const user = userEvent.setup();
    renderApp('/tools/text-diff');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    await user.click(screen.getByRole('button', { name: 'Copiar diff' }));
    expect(await navigator.clipboard.readText()).toBe(
      '  Cliente: Maria\n- Valor: 100,00\n+ Valor: 120,00\n  Status: pendente\n+ Obs: reajuste',
    );
  });

  it('não aparece quando os textos são iguais', async () => {
    const user = userEvent.setup();
    renderApp('/tools/text-diff');
    await user.click(await screen.findByRole('button', { name: 'Comparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Os textos são iguais.');
    expect(screen.queryByRole('button', { name: 'Copiar diff' })).not.toBeInTheDocument();
  });
});
