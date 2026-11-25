export type JsonResult =
  { ok: true; output: string; value: unknown } | { ok: false; error: JsonError };

export interface JsonError {
  message: string;
  /** Linha e coluna começando em 1, quando o motor informa a posição. */
  line?: number;
  column?: number;
}

/** Limite padrão para não travar a aba com colagens enormes (5 MB). */
export const JSON_MAX_INPUT = 5 * 1024 * 1024;

/**
 * Profundidade máxima de aninhamento. Ordenar chaves, serializar e localizar
 * erro são recursivos; sem limite, `[[[[…` com milhares de níveis estoura a pilha.
 */
export const JSON_MAX_DEPTH = 1000;

/**
 * Maior profundidade de `[`/`{` fora de strings, contada sem recursão.
 * Funciona também em JSON inválido, por isso roda antes do parse.
 */
export function jsonNestingDepth(text: string): number {
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') max = Math.max(max, ++depth);
    else if (ch === ']' || ch === '}') depth--;
  }
  return max;
}

export function parseJson(input: string, maxLength = JSON_MAX_INPUT): JsonResult {
  if (input.length > maxLength) {
    return {
      ok: false,
      error: { message: `Entrada maior que o limite de ${maxLength} caracteres.` },
    };
  }
  if (input.trim() === '') {
    return { ok: false, error: { message: 'Entrada vazia.' } };
  }
  if (jsonNestingDepth(input) > JSON_MAX_DEPTH) {
    return {
      ok: false,
      error: { message: `Aninhamento maior que o limite de ${JSON_MAX_DEPTH} níveis.` },
    };
  }
  try {
    const value: unknown = JSON.parse(input);
    return { ok: true, value, output: input };
  } catch (err) {
    return { ok: false, error: describeJsonError(input, err) };
  }
}

export function formatJson(input: string, indent: number | '\t' = 2, sortKeys = false): JsonResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const value = sortKeys ? sortDeep(parsed.value) : parsed.value;
  return { ok: true, value, output: JSON.stringify(value, null, indent) };
}

export function minifyJson(input: string): JsonResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value, output: JSON.stringify(parsed.value) };
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === 'object') {
    // Objeto sem protótipo: uma chave "__proto__" vira propriedade comum em vez
    // de acionar o setter de protótipo e sumir do resultado.
    const out = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(value).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Extrai a posição do erro. V8 informa "at position N" ou "(line L column C)";
 * outros motores podem não informar nada, então a posição é opcional.
 */
export function describeJsonError(input: string, err: unknown): JsonError {
  const message = err instanceof Error ? err.message : String(err);
  const lineCol = /line (\d+) column (\d+)/.exec(message);
  if (lineCol) {
    return { message, line: Number(lineCol[1]), column: Number(lineCol[2]) };
  }
  const pos = /position (\d+)/.exec(message);
  const offset = pos ? Number(pos[1]) : findJsonErrorOffset(input);
  if (offset !== null) {
    const { line, column } = offsetToLineColumn(input, offset);
    return { message, line, column };
  }
  return { message };
}

/**
 * Scanner mínimo de JSON que só devolve onde a leitura falha.
 * Existe porque o V8 nem sempre informa a posição na mensagem de erro.
 * Retorna `null` se não achar erro (o motor e o scanner discordaram).
 */
export function findJsonErrorOffset(text: string): number | null {
  let i = 0;
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i]!)) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const literal = (word: string) => {
    if (text.startsWith(word, i)) i += word.length;
    else fail();
  };
  const string = () => {
    i++; // aspas de abertura
    while (i < text.length) {
      const ch = text[i]!;
      if (ch === '"') {
        i++;
        return;
      }
      if (ch.charCodeAt(0) < 0x20) fail();
      if (ch === '\\') {
        const esc = text[i + 1];
        if (esc === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
            i += 2;
            fail();
          }
          i += 6;
        } else if (esc !== undefined && '"\\/bfnrt'.includes(esc)) i += 2;
        else {
          i++;
          fail();
        }
      } else i++;
    }
    fail();
  };
  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m || m[0] === '' || m[0] === '-') fail();
    i += m![0].length;
  };
  const value = (): void => {
    ws();
    const ch = text[i];
    if (ch === '{') {
      i++;
      ws();
      if (text[i] === '}') {
        i++;
        return;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        string();
        ws();
        if (text[i] !== ':') fail();
        i++;
        value();
        ws();
        if (text[i] === ',') i++;
        else if (text[i] === '}') {
          i++;
          return;
        } else fail();
      }
    } else if (ch === '[') {
      i++;
      ws();
      if (text[i] === ']') {
        i++;
        return;
      }
      for (;;) {
        value();
        ws();
        if (text[i] === ',') i++;
        else if (text[i] === ']') {
          i++;
          return;
        } else fail();
      }
    } else if (ch === '"') string();
    else if (ch === 't') literal('true');
    else if (ch === 'f') literal('false');
    else if (ch === 'n') literal('null');
    else number();
  };
  try {
    value();
    ws();
    return i < text.length ? i : null;
  } catch (offset) {
    if (typeof offset === 'number') return offset;
    throw offset;
  }
}

export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}
