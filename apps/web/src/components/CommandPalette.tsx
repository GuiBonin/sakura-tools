import { Modal } from '@guibonin/sakura-ui';
import { Search } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import type { ToolDefinition } from '@sakura-tools/core';
import { useNavigate } from 'react-router';
import { toolPath } from '../lib/toolPath';
import { useI18n } from '../i18n/I18nProvider';
import { registry } from '../registry';
import { Icon } from './Icon';

/** Busca global (Ctrl+K / ⌘K). Combobox acessível com navegação por setas. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lt, locale } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => registry.search(query, locale).slice(0, 20), [query, locale]);

  // O Layout remonta este componente (via `key`) a cada abertura,
  // então a busca sempre começa vazia sem precisar de efeito.

  const go = (tool: { slug: string; category: ToolDefinition['category'] }) => {
    onClose();
    void navigate(toolPath(tool));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('search.open')}
      size="md"
      initialFocus={inputRef}
      className="st-palette"
    >
      <div className="st-palette__search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-label={t('search.placeholder')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && results[active]) {
              e.preventDefault();
              go(results[active]);
            }
          }}
        />
      </div>
      <ul id={listId} role="listbox" className="st-palette__list" aria-label={t('nav.tools')}>
        {results.length === 0 && <li className="st-palette__empty">{t('search.empty')}</li>}
        {results.map((tool, i) => (
          // Padrão combobox + aria-activedescendant: o teclado fica no input,
          // o clique na opção é só o atalho de mouse.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={tool.id}
            id={`${listId}-${tool.id}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'st-palette__item is-active' : 'st-palette__item'}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(tool)}
          >
            <Icon name={tool.icon} size={18} />
            <span>
              <strong>{lt(tool.name)}</strong>
              <small>{lt(tool.description)}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="st-hint st-palette__hint">{t('search.hint')}</p>
    </Modal>
  );
}
