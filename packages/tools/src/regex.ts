import { msg, type MessageLike } from './messages';
/**
 * Execução de expressões regulares. Esta função é síncrona e pode travar com
 * padrões catastróficos. A interface roda ela dentro de um Web Worker com
 * timeout (ver apps/web/src/workers/regex.worker.ts) para isolar esse risco.
 */

export interface RegexMatch {
  index: number;
  match: string;
  groups: Array<string | undefined>;
  named?: Record<string, string | undefined>;
}

export type RegexResult =
  { ok: true; matches: RegexMatch[]; truncated: boolean } | { ok: false; error: MessageLike };

export const REGEX_MAX_MATCHES = 1000;
export const REGEX_MAX_INPUT = 1024 * 1024;
const VALID_FLAGS = /^[dgimsuvy]*$/;

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  maxMatches = REGEX_MAX_MATCHES,
): RegexResult {
  if (!VALID_FLAGS.test(flags) || new Set(flags).size !== flags.length) {
    return { ok: false, error: msg('regex.badFlags', { flags }) };
  }
  if (text.length > REGEX_MAX_INPUT) {
    return { ok: false, error: msg('regex.tooLarge', { max: REGEX_MAX_INPUT }) };
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const matches: RegexMatch[] = [];
  let truncated = false;
  const global = flags.includes('g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      index: m.index,
      match: m[0],
      groups: m.slice(1),
      ...(m.groups ? { named: { ...m.groups } } : {}),
    });
    if (!global) break;
    // Evita laço infinito em match vazio. Com `u`/`v` o avanço é por ponto de
    // código: parar no meio de um par substituto (emoji) faz o motor voltar
    // para o início do caractere e repetir o mesmo match.
    if (m[0] === '')
      re.lastIndex = advanceIndex(text, re.lastIndex, re.unicode || flags.includes('v'));
    if (matches.length >= maxMatches) {
      truncated = re.exec(text) !== null;
      break;
    }
  }
  return { ok: true, matches, truncated };
}

export function replaceRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): string {
  return text.replace(new RegExp(pattern, flags), replacement);
}

/** Próxima posição após `index`, pulando o par substituto inteiro em modo Unicode. */
export function advanceIndex(text: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= text.length) return index + 1;
  const code = text.charCodeAt(index);
  const next = text.charCodeAt(index + 1);
  const isPair = code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
  return index + (isPair ? 2 : 1);
}
