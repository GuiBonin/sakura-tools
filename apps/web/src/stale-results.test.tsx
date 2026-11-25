import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

// Regressões da rodada de QA do Codex: resultado de uma entrada antiga
// nunca pode aparecer junto com uma entrada nova.

const SHA_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function textFile(content: string, name: string): File {
  const file = new File([content], name, { type: 'text/plain' });
  if (!file.arrayBuffer) {
    Object.assign(file, { arrayBuffer: async () => new TextEncoder().encode(content).buffer });
  }
  return file;
}

describe('Resultado antigo não aparece para entrada nova', () => {
  it('Hash: arquivo recusado não mantém o hash do anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('radio', { name: 'Arquivo' }));
    const input = document.getElementById('hash-file') as HTMLInputElement;
    await user.upload(input, textFile('abc', 'a.txt'));
    expect(await screen.findByText(SHA_ABC)).toBeInTheDocument();

    const big = new File(['x'], 'grande.bin');
    Object.defineProperty(big, 'size', { value: 600 * 1024 * 1024 });
    await user.upload(input, big);
    expect(await screen.findByText('Arquivo maior que 512 MB.')).toBeInTheDocument();
    expect(screen.queryByText(SHA_ABC)).not.toBeInTheDocument();
  });

  it('Hash: comparação não usa hash de arquivo anterior', async () => {
    const user = userEvent.setup();
    renderApp('/tools/hash-generator');
    await user.click(await screen.findByRole('radio', { name: 'Arquivo' }));
    const input = document.getElementById('hash-file') as HTMLInputElement;
    await user.upload(input, textFile('abc', 'a.txt'));
    await screen.findByText(SHA_ABC);
    await user.type(screen.getByLabelText(/Comparar com hash esperado/), SHA_ABC);
    expect(screen.getByText('Confere com um dos hashes acima.')).toBeInTheDocument();
    await user.upload(input, textFile('outro', 'b.txt'));
    expect(await screen.findByText('Não confere com nenhum hash.')).toBeInTheDocument();
  });

  it('QR Code: ao mudar o conteúdo, o QR anterior some até o novo ficar pronto', async () => {
    renderApp('/tools/qr-code');
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'outro conteúdo' } });
    expect(screen.queryByRole('img', { name: 'QR Code gerado' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SVG' })).toBeDisabled();
    expect(await screen.findByRole('img', { name: 'QR Code gerado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SVG' })).toBeEnabled();
  });

  it('Regex: ao mudar o texto, o resultado anterior some até a nova execução', async () => {
    const user = userEvent.setup();
    renderApp('/tools/regex-tester');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(await screen.findByText('2 match(es).')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Texto de teste'), { target: { value: '2026-01-01' } });
    expect(screen.queryByText('2 match(es).')).not.toBeInTheDocument();
    expect(await screen.findByText('1 match(es).')).toBeInTheDocument();
  });

  it('JWT: mostra os selos de nbf futuro e exp passado juntos', async () => {
    renderApp('/tools/jwt-decoder');
    const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
    const token = `${enc({ alg: 'HS256' })}.${enc({ nbf: 4102444800, exp: 1000 })}.s`;
    fireEvent.change(await screen.findByLabelText('JWT'), { target: { value: token } });
    expect(await screen.findByText('Expirado')).toBeInTheDocument();
    expect(screen.getByText('Ainda não vigente (nbf)')).toBeInTheDocument();
  });

  it('JWT: exp absurdo aparece como inválido, nunca como dentro do prazo', async () => {
    renderApp('/tools/jwt-decoder');
    const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
    const token = `${enc({ alg: 'HS256' })}.${enc({ exp: 1e20 })}.s`;
    fireEvent.change(await screen.findByLabelText('JWT'), { target: { value: token } });
    expect(await screen.findByText('exp inválido')).toBeInTheDocument();
    expect(screen.queryByText('Dentro do prazo (exp)')).not.toBeInTheDocument();
  });
});
