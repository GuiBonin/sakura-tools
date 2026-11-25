/**
 * Contratos do núcleo público do Sakura Tools.
 *
 * Tudo aqui é MIT e não depende de nenhum serviço comercial. Os módulos
 * proprietários (sakura-tools-pro, sakura-tools-api) consomem estes tipos
 * como dependência versionada, nunca o contrário.
 */

export type Locale = 'pt-BR' | 'en';

export const LOCALES: readonly Locale[] = ['pt-BR', 'en'];

/** Texto traduzido. pt-BR é obrigatório porque é o idioma principal. */
export type LocalizedText = { 'pt-BR': string } & Partial<Record<Exclude<Locale, 'pt-BR'>, string>>;

export type ToolCategoryId =
  | 'programming'
  | 'converters'
  | 'generators'
  | 'text'
  | 'security'
  | 'network'
  | 'frontend'
  | 'dates'
  | 'brazil'
  | 'fiscal';

/**
 * Onde a ferramenta roda.
 * - `local`: só no navegador, nenhum dado sai do dispositivo.
 * - `remote`: precisa de backend (módulo comercial ou serviço opcional).
 */
export type ToolExecution = 'local' | 'remote';

/**
 * Disponibilidade exibida na interface.
 * `planned` aparece só no roadmap, nunca como ferramenta clicável.
 */
export type ToolStatus = 'stable' | 'beta' | 'planned';

/**
 * Identificador de plano. Texto livre de propósito: a lógica comercial
 * usa entitlements, não o nome do plano. Ver `Entitlement`.
 */
export type PlanId = string;

export interface ToolDefinition {
  /** Identificador estável. Não muda mesmo se o slug mudar. */
  id: string;
  /** Usado na URL: /tools/:slug */
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  category: ToolCategoryId;
  /** Nome de um ícone do lucide-react. A UI resolve o componente. */
  icon: string;
  keywords: string[];
  version: string;
  execution: ToolExecution;
  status: ToolStatus;
  /**
   * Apenas informativo, para navegação e selos na interface.
   * A autorização real de recursos comerciais acontece no servidor.
   */
  minimumPlan?: PlanId;
  /** Recursos do navegador que a ferramenta exige (ex.: `crypto.subtle`, `Worker`). */
  requirements?: string[];
}

export interface ToolCategory {
  id: ToolCategoryId;
  name: LocalizedText;
  icon: string;
  order: number;
}
