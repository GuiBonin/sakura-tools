import { Badge, Button, Tooltip } from '@guibonin/sakura-ui';
import type { ToolDefinition } from '@sakura-tools/core';
import { ShieldCheck, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useFavorites } from '../lib/storage';
import { Icon } from './Icon';

/** Cabeçalho comum: ícone, nome, descrição, selo de execução local e favorito. */
export function ToolHeader({ tool }: { tool: ToolDefinition }) {
  const { t, lt } = useI18n();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(tool.id);
  const favLabel = fav ? t('tool.unfavorite') : t('tool.favorite');
  return (
    <header className="st-tool-header">
      <div className="st-tool-header__icon">
        <Icon name={tool.icon} size={24} />
      </div>
      <div className="st-tool-header__text">
        <h1>{lt(tool.name)}</h1>
        <p>{lt(tool.description)}</p>
        <div className="st-tool-header__badges">
          {tool.execution === 'local' && (
            <Badge tone="success" appearance="soft" icon={<ShieldCheck size={14} />}>
              {t('tool.local')}
            </Badge>
          )}
          {tool.status === 'beta' && <Badge tone="warning">{t('common.beta')}</Badge>}
        </div>
      </div>
      <Tooltip content={favLabel}>
        <Button
          variant="ghost"
          iconOnly
          aria-label={favLabel}
          aria-pressed={fav}
          onClick={() => toggle(tool.id)}
          className={fav ? 'st-fav is-active' : 'st-fav'}
        >
          <Star size={20} fill={fav ? 'currentColor' : 'none'} />
        </Button>
      </Tooltip>
    </header>
  );
}

/** Seção de ajuda curta no rodapé de cada ferramenta. */
export function ToolHelp({ children }: { children: ReactNode }) {
  return <section className="st-tool-help">{children}</section>;
}
