import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX } from './lib/storage';
import { renderApp } from './test-utils';

const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLTextAreaElement).value;

describe('Interações das ferramentas', () => {
  it('Base64: codifica, decodifica e mostra erro de entrada inválida', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    const input = await screen.findByLabelText('Entrada');
    await user.type(input, 'ação');
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(valueOf('Resultado')).toBe('YcOnw6Nv');
    await user.clear(input);
    await user.type(input, 'abc$');
    await user.click(screen.getByRole('button', { name: 'Decodificar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Base64/);
  });

  it('URL: codifica parâmetro e lista parâmetros de URL completa', async () => {
    const user = userEvent.setup();
    renderApp('/tools/url-encoder');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    await user.click(screen.getByRole('button', { name: 'Codificar' }));
    expect(valueOf('Resultado')).toContain('https%3A%2F%2F');
    expect(screen.getByRole('table', { name: 'Parâmetros da URL' })).toHaveTextContent(
      'ação e reação',
    );
  });

  it('UUID: gera a quantidade pedida na versão 7', async () => {
    const user = userEvent.setup();
    renderApp('/tools/uuid-generator');
    const qty = await screen.findByLabelText('Quantidade (até 1000)');
    await user.clear(qty);
    await user.type(qty, '3');
    await user.click(screen.getByRole('radio', { name: /v7/ }));
    await user.click(screen.getByRole('button', { name: 'Gerar' }));
    const ids = valueOf('UUIDs gerados').split('\n');
    expect(ids).toHaveLength(3);
    for (const id of ids) expect(id[14]).toBe('7');
  });

  it('Cores: converte e calcula contraste', async () => {
    const user = userEvent.setup();
    renderApp('/tools/color-converter');
    const input = await screen.findByLabelText('Cor (HEX, RGB, HSL ou CMYK)');
    await user.clear(input);
    await user.type(input, '#000');
    expect(screen.getByText('rgb(0, 0, 0)')).toBeInTheDocument();
    expect(screen.getByText('cmyk(0%, 0%, 0%, 100%)')).toBeInTheDocument();
    expect(screen.getByText('21:1')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'cmyk(100%, 0%, 0%, 0%)');
    expect(screen.getByText('#00ffff')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'azul');
    expect(screen.getByText('Formato de cor não reconhecido.')).toBeInTheDocument();
  });

  it('Diff: compara e reconhece textos iguais', async () => {
    const user = userEvent.setup();
    renderApp('/tools/text-diff');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('+2 / −1 linhas');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Os textos são iguais.');
  });

  it('Timestamp: converte timestamp e data ISO', async () => {
    const user = userEvent.setup();
    renderApp('/tools/unix-timestamp');
    const ts = await screen.findByLabelText('Timestamp');
    await user.clear(ts);
    await user.type(ts, '1764072000');
    expect(screen.getByText('2025-11-25T12:00:00.000Z')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Data (ISO 8601)'), '1970-01-01T00:01:00Z');
    expect(screen.getAllByText('60').length).toBeGreaterThan(0);
    await user.clear(ts);
    await user.type(ts, 'abc');
    expect(screen.getByText('Informe apenas números.')).toBeInTheDocument();
  });

  it('Hash: calcula SHA-256, HMAC e confere hash esperado', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    const sha = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(await screen.findByText(sha)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Chave HMAC (opcional)'), 'key');
    expect(await screen.findByText('HMAC-SHA-256')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Comparar com hash esperado/), sha.toUpperCase());
    expect(screen.getByText('Confere com um dos hashes acima.')).toBeInTheDocument();
  });

  it('Hash: calcula hash de arquivo enviado', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('radio', { name: 'Arquivo' }));
    const input = document.getElementById('hash-file') as HTMLInputElement;
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });
    // jsdom não implementa Blob.arrayBuffer em todas as versões
    if (!file.arrayBuffer)
      Object.assign(file, { arrayBuffer: async () => new TextEncoder().encode('abc').buffer });
    await user.upload(input, file);
    expect(
      await screen.findByText('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    ).toBeInTheDocument();
  });

  it('Senha: opção sem tipo de caractere mostra erro', async () => {
    const user = userEvent.setup();
    renderApp('/tools/password-generator');
    for (const name of ['a–z', 'A–Z', '0–9', '!@#$']) {
      await user.click(await screen.findByRole('checkbox', { name }));
    }
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecione pelo menos um tipo de caractere.',
    );
  });

  it('QR Code: gera imagem e troca para Wi-Fi', async () => {
    const user = userEvent.setup();
    renderApp('/tools/qr-code');
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Wi-Fi' }));
    expect(screen.queryByRole('img', { name: 'QR Code gerado' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome da rede (SSID)'), 'Casa');
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();
  });

  it('CNPJ: valida alfanumérico e mostra selo', async () => {
    const user = userEvent.setup();
    renderApp('/tools/cnpj-validator');
    await user.type(await screen.findByLabelText('CNPJ'), '12ABC34501DE35');
    expect(screen.getByRole('status')).toHaveTextContent('12.ABC.345/01DE-35');
    expect(screen.getByText('Alfanumérico', { selector: '.sk-badge, span' })).toBeInTheDocument();
  });
});

describe('Configurações', () => {
  it('apaga dados locais', async () => {
    const user = userEvent.setup();
    localStorage.setItem(`${STORAGE_PREFIX}favorites`, '["base64"]');
    localStorage.setItem('outra-app', 'fica');
    renderApp('/settings');
    await user.click(await screen.findByRole('button', { name: 'Apagar dados locais' }));
    await waitFor(() => expect(localStorage.getItem(`${STORAGE_PREFIX}favorites`)).toBeNull());
    expect(localStorage.getItem('outra-app')).toBe('fica');
  });
});
