import type { ToolDefinition } from '@sakura-tools/core';

/**
 * Ferramentas fiscais moram em /fiscal/:slug; as demais, em /tools/:slug.
 * A rota errada redireciona para a certa (ver ToolPage).
 */
export type ToolBase = 'tools' | 'fiscal';

export function toolBase(tool: Pick<ToolDefinition, 'category'>): ToolBase {
  return tool.category === 'fiscal' ? 'fiscal' : 'tools';
}

export function toolPath(tool: Pick<ToolDefinition, 'category' | 'slug'>): string {
  return `/${toolBase(tool)}/${tool.slug}`;
}

/**
 * Endereços extras que abrem uma ferramenta existente. A NFC-e usa o mesmo
 * leiaute da NF-e, então /fiscal/nfce-viewer abre o mesmo visualizador.
 */
export const FISCAL_ALIASES: Readonly<Record<string, string>> = {
  'nfce-viewer': 'nfe-viewer',
};
