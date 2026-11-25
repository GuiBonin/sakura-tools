import { Spinner } from '@guibonin/sakura-ui';
import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ToolHeader } from '../components/ToolShell';
import { Notice } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useRecents } from '../lib/storage';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { TOOL_COMPONENTS, registry } from '../registry';
import NotFound from './NotFound';

class ToolErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: boolean }
> {
  override state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  override render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

export default function ToolPage() {
  const { slug = '' } = useParams();
  const { t, tr, lt } = useI18n();
  const { push } = useRecents();
  const tool = registry.getBySlug(slug);
  const Cmp = tool ? TOOL_COMPONENTS[tool.id] : undefined;

  useDocumentMeta(
    tool ? lt(tool.name) : t('tool.notFound'),
    tool ? lt(tool.description) : undefined,
  );

  useEffect(() => {
    // Recentes guardam só o ID, nunca o que foi digitado na ferramenta.
    if (tool && tool.status !== 'planned') push(tool.id);
  }, [tool, push]);

  if (!tool) return <NotFound />;

  if (tool.status === 'planned' || !Cmp) {
    return (
      <div className="st-page">
        <ToolHeader tool={tool} />
        <Notice tone="info">
          {t('tool.planned')} <Link to="/roadmap">{t('nav.roadmap')}</Link>
        </Notice>
      </div>
    );
  }

  return (
    <div className="st-page st-tool-page">
      <ToolHeader tool={tool} />
      <ToolErrorBoundary
        key={tool.id}
        fallback={
          <Notice tone="danger">
            {tr(
              'A ferramenta encontrou um erro inesperado. Recarregue a página.',
              'The tool hit an unexpected error. Reload the page.',
            )}
          </Notice>
        }
      >
        <Suspense fallback={<Spinner label={t('tool.loading')} />}>
          <Cmp />
        </Suspense>
      </ToolErrorBoundary>
    </div>
  );
}
