import type { ToolDefinition } from '@sakura-tools/core';
import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { Icon } from './Icon';

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { lt } = useI18n();
  return (
    <Link to={`/tools/${tool.slug}`} className="st-tool-card">
      <span className="st-tool-card__icon">
        <Icon name={tool.icon} size={20} />
      </span>
      <span className="st-tool-card__body">
        <strong>{lt(tool.name)}</strong>
        <span>{lt(tool.description)}</span>
      </span>
    </Link>
  );
}

export function ToolGrid({ tools }: { tools: ToolDefinition[] }) {
  return (
    <ul className="st-tool-grid">
      {tools.map((t) => (
        <li key={t.id}>
          <ToolCard tool={t} />
        </li>
      ))}
    </ul>
  );
}
