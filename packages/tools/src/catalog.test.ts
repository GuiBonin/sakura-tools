import { ToolRegistry } from '@sakura-tools/core';
import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';

describe('Catálogo', () => {
  const registry = new ToolRegistry(CATALOG);

  it('monta o registro sem conflitos e tem as 15 ferramentas do MVP', () => {
    expect(registry.available()).toHaveLength(15);
  });

  it('toda ferramenta disponível tem nome e descrição nos dois idiomas e palavras-chave', () => {
    for (const t of registry.available()) {
      expect(t.name.en, t.id).toBeTruthy();
      expect(t.description.en, t.id).toBeTruthy();
      expect(t.keywords.length, t.id).toBeGreaterThan(0);
      expect(t.execution).toBe('local');
    }
  });

  it('ferramentas planejadas não aparecem como disponíveis', () => {
    expect(registry.planned().length).toBeGreaterThan(0);
    expect(registry.search('nfe', 'pt-BR').every((t) => t.status !== 'planned')).toBe(true);
  });
});
