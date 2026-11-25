import type { EntitlementSnapshot } from './entitlements';
import type { ToolDefinition } from './types';

/**
 * Contrato para extensões (ex.: o app comercial sakura-tools-pro).
 *
 * O app público funciona com zero extensões. Uma extensão pode adicionar
 * ferramentas e uma fonte de entitlements, mas não remove nem altera as
 * ferramentas gratuitas.
 */
export interface SakuraExtension {
  id: string;
  version: string;
  tools?: ToolDefinition[];
  /** Fonte de entitlements, normalmente um cliente HTTP do backend comercial. */
  entitlements?: EntitlementSource;
}

export interface EntitlementSource {
  /** Retorna `null` quando não há sessão. Não deve lançar por falta de login. */
  load(signal?: AbortSignal): Promise<EntitlementSnapshot | null>;
}

/**
 * Interface genérica de provedores de IA. Só o contrato fica no público.
 * Implementações rodam no backend comercial, onde está a chave.
 */
export interface AIProvider {
  id: string;
  generate(request: AIRequest, signal?: AbortSignal): Promise<AIResponse>;
  estimateUsage(request: AIRequest): AIUsageEstimate;
  getModelCapabilities(model: string): AIModelCapabilities | undefined;
}

export interface AIRequest {
  /** Nome lógico configurado por ambiente (ex.: `fiscal-explain`), nunca o nome do modelo. */
  task: string;
  input: string;
  maxOutputTokens: number;
}

export interface AIResponse {
  output: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

export interface AIUsageEstimate {
  inputTokens: number;
  maxOutputTokens: number;
  /** Custo estimado em milionésimos da moeda, para evitar ponto flutuante. */
  estimatedCostMicros: number;
}

export interface AIModelCapabilities {
  contextWindow: number;
  structuredOutput: boolean;
}
