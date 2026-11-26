/**
 * Comparação campo a campo entre dois XML (pensada para NF-e, funciona com
 * qualquer XML bem formado).
 *
 * Cada valor vira um caminho: `NFe/infNFe/det[2]/prod/vProd`. Irmãos com o
 * mesmo nome ganham índice a partir de 1; atributos aparecem como
 * `infNFe/@Id`. A assinatura (`Signature`) fica de fora por padrão, porque
 * muda a cada emissão e esconderia as diferenças que importam.
 */
import { msg, type ToolMessage } from '@sakura-tools/tools/messages';
import { XmlError } from '@sakura-tools/tools/xml';
import { parseXmlTree, type XmlElement } from '@sakura-tools/tools/xmlTree';

export type DiffKind = 'changed' | 'onlyLeft' | 'onlyRight';

export interface XmlDiff {
  path: string;
  kind: DiffKind;
  left?: string;
  right?: string;
}

export interface CompareResult {
  ok: true;
  diffs: XmlDiff[];
  /** Quantidade de valores comparados (união dos dois lados). */
  compared: number;
}

export interface CompareFailure {
  ok: false;
  side: 'left' | 'right';
  error: { message: ToolMessage; line?: number; column?: number };
}

export function flattenXml(
  root: XmlElement,
  { ignoreSignature = true }: { ignoreSignature?: boolean } = {},
): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (el: XmlElement, path: string) => {
    for (const [k, v] of Object.entries(el.attrs)) out.set(`${path}/@${k}`, v);
    const text = el.text.trim();
    if (el.children.length === 0 || text) out.set(path, text);
    const total = new Map<string, number>();
    for (const c of el.children) total.set(c.name, (total.get(c.name) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const c of el.children) {
      if (ignoreSignature && c.local === 'Signature') continue;
      const n = (seen.get(c.name) ?? 0) + 1;
      seen.set(c.name, n);
      walk(c, `${path}/${c.name}${total.get(c.name)! > 1 ? `[${n}]` : ''}`);
    }
  };
  walk(root, root.name);
  return out;
}

function compareFlat(a: Map<string, string>, b: Map<string, string>): XmlDiff[] {
  const diffs: XmlDiff[] = [];
  for (const [path, l] of a) {
    if (!b.has(path)) diffs.push({ path, kind: 'onlyLeft', left: l });
    else if (b.get(path) !== l) diffs.push({ path, kind: 'changed', left: l, right: b.get(path) });
  }
  for (const [path, r] of b) {
    if (!a.has(path)) diffs.push({ path, kind: 'onlyRight', right: r });
  }
  return diffs;
}

export function compareXmlTrees(
  left: XmlElement,
  right: XmlElement,
  opts: { ignoreSignature?: boolean } = {},
): XmlDiff[] {
  return compareFlat(flattenXml(left, opts), flattenXml(right, opts));
}

/** Lê os dois XML e compara. Nunca lança. */
export function compareXml(
  left: string,
  right: string,
  opts: { ignoreSignature?: boolean } = {},
): CompareResult | CompareFailure {
  const read = (s: string, side: 'left' | 'right') => {
    try {
      return { ok: true as const, tree: parseXmlTree(s) };
    } catch (err) {
      if (err instanceof XmlError) {
        return {
          ok: false as const,
          side,
          error: { message: err.toolMessage, line: err.line, column: err.column },
        };
      }
      throw err;
    }
  };
  if (!left.trim()) return { ok: false, side: 'left', error: { message: msg('json.empty') } };
  if (!right.trim()) return { ok: false, side: 'right', error: { message: msg('json.empty') } };
  const l = read(left, 'left');
  if (!l.ok) return l;
  const r = read(right, 'right');
  if (!r.ok) return r;
  const a = flattenXml(l.tree, opts);
  const b = flattenXml(r.tree, opts);
  const compared = new Set([...a.keys(), ...b.keys()]).size;
  return { ok: true, diffs: compareFlat(a, b), compared };
}
