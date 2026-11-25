import { msg, ToolError, type ToolMessage } from './messages';
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
  warnings: ToolMessage[];
}

export type JwtTemporal = 'expired' | 'not-yet-valid' | 'within-window' | 'no-exp' | 'invalid-exp';

/** Maior data representável pelo `Date`, em segundos (±8,64e12). */
const MAX_NUMERIC_DATE = 8.64e12;

function decodeSegment(segment: string, label: string): Record<string, unknown> {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(segment));
  } catch {
    throw new ToolError('jwt.notBase64Url', { part: label });
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ToolError('jwt.notJson', { part: label });
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ToolError('jwt.notObject', { part: label });
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
    throw new ToolError('jwt.jwe');
  }
  if (parts.length !== 3) {
    throw new ToolError('jwt.parts');
  }
  const header = decodeSegment(parts[0]!, 'header');
  const payload = decodeSegment(parts[1]!, 'payload');
  const signature = parts[2]!;

  const times = {
    issuedAt: numericDate(payload.iat),
    notBefore: numericDate(payload.nbf),
    expiresAt: numericDate(payload.exp),
  };

  const warnings: ToolMessage[] = [];
  const alg = typeof header.alg === 'string' ? header.alg : undefined;
  if (!alg) warnings.push(msg('jwt.noAlg'));
  if (alg?.toLowerCase() === 'none') {
    warnings.push(msg('jwt.algNone'));
  }
  if (signature === '' && alg?.toLowerCase() !== 'none') {
    warnings.push(msg('jwt.emptySignature'));
  }
  for (const claim of ['exp', 'nbf', 'iat'] as const) {
    const v = payload[claim];
    if (v === undefined) continue;
    if (typeof v !== 'number') {
      warnings.push(msg('jwt.claimNotNumber', { claim }));
    } else if (numericDate(v) === undefined) {
      warnings.push(msg('jwt.claimOutOfRange', { claim }));
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
