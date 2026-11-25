/**
 * Contratos de planos e entitlements.
 *
 * O núcleo público só define o formato. Quem decide o que cada usuário pode
 * fazer é o backend comercial (sakura-tools-api). Nada aqui libera acesso:
 * o cliente nunca é fonte de verdade para plano, crédito ou permissão.
 */

/** Chave de um direito. Ex.: `ai.requests`, `batch.files`, `history.sync`. */
export type EntitlementKey = string;

export type Entitlement =
  | { key: EntitlementKey; kind: 'flag'; enabled: boolean }
  | { key: EntitlementKey; kind: 'limit'; limit: number; period: 'request' | 'day' | 'month' }
  | { key: EntitlementKey; kind: 'credits'; monthly: number };

export interface Plan {
  id: string;
  /** Preço em centavos, configurável pelo administrador. Nunca fixo em regra de negócio. */
  priceCents: number;
  currency: 'BRL' | 'USD';
  interval: 'month' | 'year';
  entitlements: Entitlement[];
  /** `planned` = ainda não vendido. A interface não deve aceitar pagamento. */
  status: 'active' | 'planned' | 'retired';
}

/** Snapshot que o backend entrega ao cliente. Só serve para desenhar a interface. */
export interface EntitlementSnapshot {
  planId: string;
  entitlements: Entitlement[];
  creditsRemaining?: number;
  /** ISO 8601. Depois disso o cliente deve buscar de novo. */
  expiresAt: string;
}

export function findEntitlement(
  snapshot: EntitlementSnapshot | null,
  key: EntitlementKey,
): Entitlement | undefined {
  return snapshot?.entitlements.find((e) => e.key === key);
}

/**
 * Indica se a interface deve mostrar o recurso como disponível.
 * Isto é só apresentação: a operação em si é revalidada no servidor.
 * Snapshot expirado conta como ausente.
 */
export function isFeatureVisible(
  snapshot: EntitlementSnapshot | null,
  key: EntitlementKey,
  now: Date = new Date(),
): boolean {
  if (!snapshot || Date.parse(snapshot.expiresAt) <= now.getTime()) return false;
  const e = findEntitlement(snapshot, key);
  if (!e) return false;
  switch (e.kind) {
    case 'flag':
      return e.enabled;
    case 'limit':
      return e.limit > 0;
    case 'credits':
      return e.monthly > 0;
  }
}
