import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

// Mensagens de erro dos pacotes seguem o idioma da interface.

describe('Erros no idioma da interface', () => {
  it('CPF inválido em inglês', async () => {
    renderApp('/tools/cpf-validator', 'en');
    fireEvent.change(await screen.findByLabelText('CPF'), { target: { value: '123' } });
    expect(screen.getByRole('status')).toHaveTextContent('A CPF has 11 digits. 3 were given.');
  });

  it('XML com DOCTYPE em inglês, com linha e coluna', async () => {
    const user = userEvent.setup();
    renderApp('/tools/xml-formatter', 'en');
    fireEvent.change(await screen.findByLabelText('Input XML'), {
      target: { value: '<!DOCTYPE x><x/>' },
    });
    await user.click(screen.getByRole('button', { name: 'Format' }));
    expect(
      screen.getByText(/^Line 1, column 1: DOCTYPE and entity declarations are rejected/),
    ).toBeInTheDocument();
  });

  it('trocar o idioma traduz o erro que já está na tela', async () => {
    const user = userEvent.setup();
    renderApp('/tools/base64');
    fireEvent.change(await screen.findByLabelText('Entrada'), { target: { value: '***' } });
    await user.click(screen.getByRole('button', { name: 'Decodificar' }));
    expect(
      screen.getByText('Texto contém caracteres que não pertencem ao Base64.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Idioma' }));
    await user.click(await screen.findByRole('menuitem', { name: 'English' }));
    expect(
      await screen.findByText('Text contains characters that are not part of Base64.'),
    ).toBeInTheDocument();
  });
});
