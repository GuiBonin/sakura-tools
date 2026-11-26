/**
 * Exportação dos itens da NF-e em CSV.
 *
 * Separador ";" e quebra de linha CRLF, que é o que o Excel em português
 * abre direto. Valores saem como estão no XML (ponto decimal). Células que
 * começam com =, +, -, @, tab ou CR ganham um apóstrofo na frente para não
 * virar fórmula na planilha (CSV injection).
 */
import type { NfeItem } from './nfe';

export const ITEM_CSV_COLUMNS = [
  'nItem',
  'cProd',
  'xProd',
  'NCM',
  'CFOP',
  'uCom',
  'qCom',
  'vUnCom',
  'vProd',
  'vDesc',
] as const satisfies readonly (keyof NfeItem)[];

export function csvCell(value: string | undefined): string {
  let v = value ?? '';
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function itemsToCsv(items: readonly NfeItem[]): string {
  const rows = [ITEM_CSV_COLUMNS.join(';')];
  for (const it of items)
    rows.push(ITEM_CSV_COLUMNS.map((c) => csvCell(it[c] as string | undefined)).join(';'));
  return `${rows.join('\r\n')}\r\n`;
}
