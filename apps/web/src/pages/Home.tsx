import { Button, usePrefersReducedMotion } from '@guibonin/sakura-ui';
import { CATEGORIES, type ToolDefinition } from '@sakura-tools/core';
import { ArrowRight, Code, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { REPO_URL } from '../components/Layout';
import { ToolGrid } from '../components/ToolCard';
import { useI18n } from '../i18n/I18nProvider';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useFavorites, useRecents } from '../lib/storage';
import { registry } from '../registry';

export default function Home() {
  const { t, tr, lt } = useI18n();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const { favorites } = useFavorites();
  const { recents } = useRecents();
  useDocumentMeta(null, t('home.subtitle'));

  const resolve = (ids: string[]) =>
    ids
      .map((id) => registry.getById(id))
      .filter((x): x is ToolDefinition => x !== undefined && x.status !== 'planned');
  const favTools = resolve(favorites);
  const recentTools = resolve(recents);

  return (
    <div className="st-page st-home">
      <section className="st-hero">
        <h1>
          {t('home.title')
            .split('\n')
            .map((line, i) => (
              <span key={i} className={i === 1 ? 'st-gradient-text' : undefined}>
                {line}
              </span>
            ))}
        </h1>
        <p>{t('home.subtitle')}</p>
        <div className="st-hero__cta">
          <Button
            size="lg"
            rightIcon={<ArrowRight size={18} />}
            onClick={() =>
              document.getElementById('all-tools')?.scrollIntoView({
                // Sem animação quando o sistema pede movimento reduzido.
                behavior: reducedMotion ? 'auto' : 'smooth',
              })
            }
          >
            {t('home.start')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            leftIcon={<Code size={18} />}
            onClick={() => window.open(REPO_URL, '_blank', 'noopener,noreferrer')}
          >
            {t('home.source')}
          </Button>
        </div>
        <p className="st-hero__privacy">
          <Lock size={14} aria-hidden="true" /> {t('home.privacyText')}
        </p>
      </section>

      <section aria-labelledby="fav-title">
        <h2 id="fav-title" className="st-h2">
          {t('nav.favorites')}
        </h2>
        {favTools.length > 0 ? (
          <ToolGrid tools={favTools} />
        ) : (
          <p className="st-hint">{t('home.favoritesEmpty')}</p>
        )}
      </section>

      {recentTools.length > 0 && (
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="st-h2">
            {t('nav.recents')}
          </h2>
          <ToolGrid tools={recentTools} />
        </section>
      )}

      <section aria-labelledby="cat-title">
        <h2 id="cat-title" className="st-h2">
          {t('nav.categories')}
        </h2>
        <ul className="st-cat-grid">
          {[...CATEGORIES]
            .sort((a, b) => a.order - b.order)
            .map((c) => {
              const count = registry.byCategory(c.id).length;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="st-cat"
                    onClick={() => void navigate(`/categories/${c.id}`)}
                  >
                    <Icon name={c.icon} size={20} />
                    <span>{lt(c.name)}</span>
                    <small>
                      {count > 0
                        ? tr(`${count} ferramenta(s)`, `${count} tool(s)`)
                        : t('common.planned')}
                    </small>
                  </button>
                </li>
              );
            })}
        </ul>
      </section>

      <section aria-labelledby="all-title" id="all-tools">
        <h2 id="all-title" className="st-h2">
          {t('home.allTools')}
        </h2>
        <ToolGrid tools={registry.available()} />
      </section>

      <section className="st-feature-row">
        <div>
          <h3>{t('home.privacyTitle')}</h3>
          <p>{t('home.privacyText')}</p>
        </div>
        <div>
          <h3>{tr('Módulo fiscal', 'Tax module')}</h3>
          <p>
            {tr(
              'Visualizador e validação estrutural de NF-e e NFC-e estão em desenvolvimento.',
              'NF-e and NFC-e viewer and structural validation are in development.',
            )}{' '}
            <Link to="/roadmap">{t('nav.roadmap')}</Link>
          </p>
        </div>
        <div>
          <h3>{t('home.openSource')}</h3>
          <p>
            {tr(
              'Código aberto para auditar, usar e contribuir.',
              'Open code to audit, use and contribute.',
            )}{' '}
            <Link to="/contribute">{t('nav.contribute')}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
