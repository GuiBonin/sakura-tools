/**
 * Consulta local da tabela de cStat do MOC 7.0, Anexo I (versão 7.03).
 * Os dados e a fonte estão em `data/cstat.ts`.
 */
import { CSTAT_ROWS } from './data/cstat';

export type CStatKind = 'result' | 'rejection' | 'denial';

export interface CStatEntry {
  code: string;
  kind: CStatKind;
  text: string;
}

export const CSTAT_SOURCE = {
  document: 'MOC 7.0, Anexo I, Leiaute e Regras de Validação da NF-e e da NFC-e',
  version: '7.03',
  published: '2020-10',
} as const;

const KIND = { r: 'result', j: 'rejection', d: 'denial' } as const;

export const CSTAT_TABLE: readonly CStatEntry[] = CSTAT_ROWS.map(([code, k, text]) => ({
  code,
  kind: KIND[k],
  text,
}));

/**
 * Sem acento, sem hífen ou ponto e em minúsculas: "rejeicao nfe" acha
 * "Rejeição ... NF-e".
 */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[-.]/g, '')
    .toLowerCase();

const FOLDED = CSTAT_TABLE.map((e) => fold(e.text));

/** Todas as entradas de um código (alguns códigos têm mais de um texto na tabela). */
export function findCStat(code: string): CStatEntry[] {
  const c = code.trim();
  return CSTAT_TABLE.filter((e) => e.code === c);
}

/**
 * Busca por código ou por palavras do texto. Um número de 1 a 3 dígitos
 * procura códigos que começam com ele; texto procura entradas que contêm
 * todas as palavras, sem diferenciar acento nem maiúscula.
 */
export function searchCStat(query: string, kinds?: readonly CStatKind[]): CStatEntry[] {
  const q = query.trim();
  const allowed = (e: CStatEntry) => !kinds || kinds.includes(e.kind);
  if (q === '') return CSTAT_TABLE.filter(allowed);
  if (/^\d{1,3}$/.test(q)) {
    return CSTAT_TABLE.filter((e) => allowed(e) && e.code.startsWith(q));
  }
  const words = fold(q).split(/\s+/u).filter(Boolean);
  return CSTAT_TABLE.filter((e, i) => allowed(e) && words.every((w) => FOLDED[i]!.includes(w)));
}
