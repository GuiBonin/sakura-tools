import { base64ToBytes } from './base64';

/**
 * Decodificador de JWT. DECODIFICAR NÃO É VALIDAR.
 *
 * Qualquer pessoa consegue montar um JWT com o conteúdo que quiser. Só a
 * verificação da assinatura, com a chave certa, prova que o token foi emitido
 * por quem diz. Esta ferramenta não verifica assinatura e nunca diz que um
 * token é válido.
 */

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  /** Datas das claims registradas, quando existirem e forem numéricas. */
  times: {
    issuedAt?: Date;
    notBefore?: Date;
    expiresAt?: Date;
  };
  /**
   * Situações temporais comparadas ao relógio local. Pode haver mais de uma
   * (ex.: `nbf` no futuro e `exp` no passado). Não diz nada sobre assinatura.
   */
  temporal: JwtTemporal[];
  warnings: string[];
}

export type JwtTemporal = 'expired' | 'not-yet-valid' | 'within-window' | 'no-exp' | 'invalid-exp';

/** Maior data representável pelo `Date`, em segundos (±8,64e12). */
const MAX_NUMERIC_DATE = 8.64e12;

function decodeSegment(segment: string, label: string): Record<string, unknown> {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(segment));
  } catch {
    throw new Error(`O ${label} não é Base64URL válido.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`O ${label} não contém JSON válido.`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`O ${label} precisa ser um objeto JSON.`);
  }
  return value as Record<string, unknown>;
}

/** Data da claim, ou `undefined` se não for um número dentro da faixa do `Date`. */
function numericDate(v: unknown): Date | undefined {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_NUMERIC_DATE
    ? new Date(v * 1000)
    : undefined;
}

export function decodeJwt(token: string, now: Date = new Date()): DecodedJwt {
  const clean = token.trim().replace(/^Bearer\s+/i, '');
  const parts = clean.split('.');
  if (parts.length === 5) {
    throw new Error(
      'Este token tem 5 partes: é um JWE (criptografado). O conteúdo não pode ser lido sem a chave.',
    );
  }
  if (parts.length !== 3) {
    throw new Error('Um JWT tem 3 partes separadas por ponto: header.payload.signature.');
  }
  const header = decodeSegment(parts[0]!, 'header');
  const payload = decodeSegment(parts[1]!, 'payload');
  const signature = parts[2]!;

  const times = {
    issuedAt: numericDate(payload.iat),
    notBefore: numericDate(payload.nbf),
    expiresAt: numericDate(payload.exp),
  };

  const warnings: string[] = [];
  const alg = typeof header.alg === 'string' ? header.alg : undefined;
  if (!alg) warnings.push('O header não informa o algoritmo (alg).');
  if (alg?.toLowerCase() === 'none') {
    warnings.push('alg "none" significa token sem assinatura. Nunca aceite isso em produção.');
  }
  if (signature === '' && alg?.toLowerCase() !== 'none') {
    warnings.push('A assinatura está vazia.');
  }
  for (const claim of ['exp', 'nbf', 'iat'] as const) {
    const v = payload[claim];
    if (v === undefined) continue;
    if (typeof v !== 'number') {
      warnings.push(`A claim "${claim}" deveria ser um número (segundos desde 1970).`);
    } else if (numericDate(v) === undefined) {
      warnings.push(`A claim "${claim}" tem um valor fora da faixa de datas válidas.`);
    }
  }

  const t = now.getTime();
  const temporal: JwtTemporal[] = [];
  const notYetValid = times.notBefore !== undefined && t < times.notBefore.getTime();
  if (notYetValid) temporal.push('not-yet-valid');
  if (payload.exp === undefined) temporal.push('no-exp');
  else if (!times.expiresAt) temporal.push('invalid-exp');
  else if (t >= times.expiresAt.getTime()) temporal.push('expired');
  else if (!notYetValid) temporal.push('within-window');

  return { header, payload, signature, times, temporal, warnings };
}
