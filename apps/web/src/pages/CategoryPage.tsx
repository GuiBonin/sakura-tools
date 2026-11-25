import { CATEGORIES } from '@sakura-tools/core';
import { useParams } from 'react-router';
import { ToolGrid } from '../components/ToolCard';
import { useI18n } from '../i18n/I18nProvider';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { registry } from '../registry';
import NotFound from './NotFound';

export default function CategoryPage() {
  const { id } = useParams();
  const { tr, lt } = useI18n();
  const category = CATEGORIES.find((c) => c.id === id);
  useDocumentMeta(category ? lt(category.name) : null);
  if (!category) return <NotFound />;
  const tools = registry.byCategory(category.id);
  const planned = registry.planned().filter((t) => t.category === category.id);

  return (
    <div className="st-page">
      <h1 className="st-h1">{lt(category.name)}</h1>
      {tools.length > 0 ? (
        <ToolGrid tools={tools} />
      ) : (
        <p className="st-hint">
          {tr(
            'Nenhuma ferramenta disponível nesta categoria ainda.',
            'No tools available in this category yet.',
          )}
        </p>
      )}
      {planned.length > 0 && (
        <>
          <h2 className="st-h2">{tr('Planejadas', 'Planned')}</h2>
          <ul className="st-planned-list">
            {planned.map((t) => (
              <li key={t.id}>{lt(t.name)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
