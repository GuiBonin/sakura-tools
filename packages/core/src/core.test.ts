import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  ToolRegistry,
  ToolRegistryError,
  isFeatureVisible,
  normalize,
  type EntitlementSnapshot,
  type ToolDefinition,
} from './index';

const tool = (over: Partial<ToolDefinition>): ToolDefinition => ({
  id: 'x',
  slug: 'x',
  name: { 'pt-BR': 'X' },
  description: { 'pt-BR': '' },
  category: 'text',
  icon: 'Type',
  keywords: [],
  version: '1.0.0',
  execution: 'local',
  status: 'stable',
  ...over,
});

describe('ToolRegistry', () => {
  const registry = new ToolRegistry([
    tool({
      id: 'json',
      slug: 'json-formatter',
      name: { 'pt-BR': 'Formatador de JSON', en: 'JSON Formatter' },
      keywords: ['minify'],
    }),
    tool({
      id: 'xml',
      slug: 'xml-formatter',
      name: { 'pt-BR': 'Formatador de XML' },
      description: { 'pt-BR': 'Validação estrutural' },
    }),
    tool({ id: 'cpf', slug: 'cpf', name: { 'pt-BR': 'Validador de CPF' }, category: 'brazil' }),
    tool({ id: 'future', slug: 'future', name: { 'pt-BR': 'Futura' }, status: 'planned' }),
  ]);

  it('rejeita slug inválido, ID e slug duplicados', () => {
    expect(() => new ToolRegistry([tool({ slug: 'Com Espaço' })])).toThrow(ToolRegistryError);
    expect(() => new ToolRegistry([tool({}), tool({ slug: 'y' })])).toThrow(/ID duplicado/);
    expect(() => new ToolRegistry([tool({}), tool({ id: 'y' })])).toThrow(/Slug duplicado/);
  });

  it('separa disponíveis de planejadas', () => {
    expect(registry.available().map((t) => t.id)).toEqual(['json', 'xml', 'cpf']);
    expect(registry.planned().map((t) => t.id)).toEqual(['future']);
    expect(registry.byCategory('brazil').map((t) => t.id)).toEqual(['cpf']);
  });

  it('busca sem acento, por palavra-chave e respeita o idioma', () => {
    expect(registry.search('validacao', 'pt-BR').map((t) => t.id)).toEqual(['xml']);
    expect(registry.search('minify', 'pt-BR').map((t) => t.id)).toEqual(['json']);
    expect(registry.search('json formatter', 'en').map((t) => t.id)).toEqual(['json']);
    expect(registry.search('formatador', 'pt-BR')).toHaveLength(2);
    expect(registry.search('futura', 'pt-BR')).toEqual([]);
    expect(registry.search('  ', 'pt-BR')).toHaveLength(3);
  });

  it('extend cria registro novo e acusa conflito', () => {
    const extended = registry.extend([tool({ id: 'pro', slug: 'pro-batch' })]);
    expect(extended.getBySlug('pro-batch')).toBeDefined();
    expect(registry.getBySlug('pro-batch')).toBeUndefined();
    expect(() => registry.extend([tool({ id: 'json', slug: 'outro' })])).toThrow();
  });

  it('normaliza acentos e caixa', () => {
    expect(normalize('  Ação ÚNICA ')).toBe('acao unica');
  });

  it('tem 10 categorias com ordem única', () => {
    expect(new Set(CATEGORIES.map((c) => c.order)).size).toBe(10);
  });
});

describe('Entitlements', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const snapshot: EntitlementSnapshot = {
    planId: 'qualquer-nome',
    expiresAt: '2026-06-02T00:00:00Z',
    entitlements: [
      { key: 'history.sync', kind: 'flag', enabled: true },
      { key: 'batch.files', kind: 'limit', limit: 0, period: 'request' },
      { key: 'ai.requests', kind: 'credits', monthly: 100 },
    ],
  };

  it('decide pela chave do entitlement e não pelo nome do plano', () => {
    expect(isFeatureVisible(snapshot, 'history.sync', now)).toBe(true);
    expect(isFeatureVisible(snapshot, 'batch.files', now)).toBe(false);
    expect(isFeatureVisible(snapshot, 'ai.requests', now)).toBe(true);
    expect(isFeatureVisible(snapshot, 'nao.existe', now)).toBe(false);
  });

  it('sem sessão ou com snapshot expirado nada aparece', () => {
    expect(isFeatureVisible(null, 'history.sync', now)).toBe(false);
    expect(isFeatureVisible(snapshot, 'history.sync', new Date('2026-06-03T00:00:00Z'))).toBe(
      false,
    );
  });
});
