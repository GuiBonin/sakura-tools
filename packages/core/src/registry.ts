import type { Locale, ToolCategoryId, ToolDefinition } from './types';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ToolRegistryError extends Error {
  override name = 'ToolRegistryError';
}

/**
 * Catálogo de ferramentas. Imutável depois de criado, para que extensões
 * comerciais montem um registro novo em vez de alterar o público.
 */
export class ToolRegistry {
  private readonly byId = new Map<string, ToolDefinition>();
  private readonly bySlug = new Map<string, ToolDefinition>();

  constructor(tools: readonly ToolDefinition[]) {
    for (const tool of tools) {
      if (!SLUG_RE.test(tool.slug)) {
        throw new ToolRegistryError(`Slug inválido: "${tool.slug}"`);
      }
      if (this.byId.has(tool.id)) {
        throw new ToolRegistryError(`ID duplicado: "${tool.id}"`);
      }
      if (this.bySlug.has(tool.slug)) {
        throw new ToolRegistryError(`Slug duplicado: "${tool.slug}"`);
      }
      this.byId.set(tool.id, tool);
      this.bySlug.set(tool.slug, tool);
    }
  }

  /** Une este registro com outro (ex.: extensões Pro). Conflitos geram erro. */
  extend(tools: readonly ToolDefinition[]): ToolRegistry {
    return new ToolRegistry([...this.byId.values(), ...tools]);
  }

  all(): ToolDefinition[] {
    return [...this.byId.values()];
  }

  /** Ferramentas utilizáveis (sem as planejadas). */
  available(): ToolDefinition[] {
    return this.all().filter((t) => t.status !== 'planned');
  }

  planned(): ToolDefinition[] {
    return this.all().filter((t) => t.status === 'planned');
  }

  getById(id: string): ToolDefinition | undefined {
    return this.byId.get(id);
  }

  getBySlug(slug: string): ToolDefinition | undefined {
    return this.bySlug.get(slug);
  }

  byCategory(category: ToolCategoryId): ToolDefinition[] {
    return this.available().filter((t) => t.category === category);
  }

  /** Busca por nome, descrição e palavras-chave, sem acento e sem caixa. */
  search(query: string, locale: Locale): ToolDefinition[] {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return this.available();

    const scored: Array<{ tool: ToolDefinition; score: number }> = [];
    for (const tool of this.available()) {
      const name = normalize(tool.name[locale] ?? tool.name['pt-BR']);
      const description = normalize(tool.description[locale] ?? tool.description['pt-BR']);
      const keywords = tool.keywords.map(normalize);
      let score = 0;
      let matchedAll = true;
      for (const term of terms) {
        let termScore = 0;
        if (name.startsWith(term)) termScore = 10;
        else if (name.includes(term)) termScore = 6;
        else if (keywords.some((k) => k.startsWith(term))) termScore = 4;
        else if (tool.slug.includes(term)) termScore = 3;
        else if (description.includes(term)) termScore = 1;
        if (termScore === 0) {
          matchedAll = false;
          break;
        }
        score += termScore;
      }
      if (matchedAll) scored.push({ tool, score });
    }
    return scored.sort((a, b) => b.score - a.score).map((s) => s.tool);
  }
}

/** Minúsculas e sem acentos, para comparar "Validação" com "validacao". */
export function normalize(text: string): string {
  // NFD separa a letra do acento; \p{M} remove as marcas combinantes.
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
