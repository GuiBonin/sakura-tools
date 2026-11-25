import { diffChars, diffLines, diffWords } from 'diff';

export type DiffMode = 'lines' | 'words' | 'chars';

export interface DiffPart {
  value: string;
  kind: 'added' | 'removed' | 'equal';
}

export interface DiffSummary {
  parts: DiffPart[];
  added: number;
  removed: number;
  identical: boolean;
}

export const DIFF_MAX_INPUT = 500_000;

export function diffTexts(
  a: string,
  b: string,
  mode: DiffMode = 'lines',
  opts: { ignoreCase?: boolean; ignoreWhitespace?: boolean } = {},
): DiffSummary {
  if (a.length > DIFF_MAX_INPUT || b.length > DIFF_MAX_INPUT) {
    throw new Error(`Cada texto pode ter no máximo ${DIFF_MAX_INPUT} caracteres.`);
  }
  const options = {
    ignoreCase: opts.ignoreCase ?? false,
    ignoreWhitespace: opts.ignoreWhitespace ?? false,
  };
  const changes =
    mode === 'lines'
      ? diffLines(a, b, options)
      : mode === 'words'
        ? diffWords(a, b, { ignoreCase: options.ignoreCase })
        : diffChars(a, b, { ignoreCase: options.ignoreCase });

  let added = 0;
  let removed = 0;
  const parts: DiffPart[] = changes.map((c) => {
    const unit = mode === 'lines' ? (c.count ?? 0) : c.value.length;
    if (c.added) added += unit;
    if (c.removed) removed += unit;
    return { value: c.value, kind: c.added ? 'added' : c.removed ? 'removed' : 'equal' };
  });
  return { parts, added, removed, identical: added === 0 && removed === 0 };
}

/**
 * Diff em texto puro, para copiar.
 * - Linhas: cada linha recebe "+ ", "- " ou "  " (como um diff unificado sem cabeçalho).
 * - Palavras e caracteres: marcação inline no formato do `git diff --word-diff`,
 *   `[-removido-]` e `{+adicionado+}`.
 */
export function diffToText(parts: DiffPart[], mode: DiffMode): string {
  if (mode !== 'lines') {
    return parts
      .map((p) =>
        p.kind === 'added' ? `{+${p.value}+}` : p.kind === 'removed' ? `[-${p.value}-]` : p.value,
      )
      .join('');
  }
  const prefix = { added: '+ ', removed: '- ', equal: '  ' } as const;
  const out: string[] = [];
  for (const p of parts) {
    const lines = p.value.split('\n');
    // "a\nb\n" vira ["a", "b", ""]: a última string vazia não é uma linha.
    if (lines.at(-1) === '') lines.pop();
    for (const line of lines) out.push(prefix[p.kind] + line);
  }
  return out.join('\n');
}
