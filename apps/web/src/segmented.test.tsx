import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Segmented } from './components/ui';

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Segmented
      label="Modo"
      value={value}
      onChange={setValue}
      options={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ]}
    />
  );
}

describe('Segmented com valor fora das opções', () => {
  it('nenhuma opção é anunciada como marcada, mas a primeira fica no Tab', () => {
    render(<Harness initial="inexistente" />);
    for (const name of ['A', 'B', 'C']) {
      expect(screen.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'false');
    }
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('tabindex', '-1');
  });

  it('seta para frente marca a primeira e seta para trás marca a última', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness initial="inexistente" />);
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'true');
    unmount();

    render(<Harness initial="inexistente" />);
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
  });

  it('com valor válido continua marcando a opção certa', () => {
    render(<Harness initial="b" />);
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('tabindex', '-1');
  });
});
