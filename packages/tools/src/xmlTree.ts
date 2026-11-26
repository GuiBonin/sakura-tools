/**
 * Árvore de elementos sobre o tokenizador seguro de `xml.ts`.
 *
 * Herda as mesmas proteções: DOCTYPE e entidades declaradas são recusados
 * antes de qualquer coisa ser montada, então não há XXE nem expansão de
 * entidades. Só as cinco entidades predefinidas e referências numéricas são
 * decodificadas.
 *
 * Namespaces são resolvidos pelas declarações `xmlns` e `xmlns:prefixo` de
 * cada elemento e dos ancestrais.
 */
import { msg } from './messages';
import { tokenizeXml, validateXml, XmlError } from './xml';

export interface XmlElement {
  /** Nome como aparece no documento, com prefixo se houver (`ds:Signature`). */
  name: string;
  /** Nome sem prefixo (`Signature`). */
  local: string;
  /** Namespace resolvido, ou `''` quando o elemento não tem namespace. */
  ns: string;
  /** Atributos com valores já decodificados. Declarações `xmlns` ficam de fora. */
  attrs: Record<string, string>;
  children: XmlElement[];
  /** Texto direto do elemento (sem o dos filhos), decodificado e com CDATA. */
  text: string;
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', apos: "'", quot: '"' };

/**
 * Decodifica as entidades predefinidas e as referências numéricas. O
 * tokenizador já garantiu que todas as referências do texto são válidas.
 */
export function decodeXmlText(raw: string): string {
  return raw.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|apos|quot);/g, (_, ref: string) => {
    if (ref.startsWith('#x')) return String.fromCodePoint(parseInt(ref.slice(2), 16));
    if (ref.startsWith('#')) return String.fromCodePoint(Number(ref.slice(1)));
    return ENTITIES[ref]!;
  });
}

function parseAttributes(rawTag: string, name: string, selfClosing: boolean) {
  const body = rawTag.slice(1 + name.length, selfClosing ? -2 : -1);
  const out: Record<string, string> = {};
  const re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out[m[1]!] = decodeXmlText(m[2] ?? m[3] ?? '');
  }
  return out;
}

const splitName = (name: string): [string, string] => {
  const i = name.indexOf(':');
  return i === -1 ? ['', name] : [name.slice(0, i), name.slice(i + 1)];
};

/**
 * Monta a árvore do documento. Lança `XmlError` (com linha e coluna quando o
 * tokenizador informa) se o XML não for bem formado.
 */
export function parseXmlTree(input: string): XmlElement {
  const check = validateXml(input);
  if (!check.ok) {
    const e = check.error!;
    throw new XmlError(e.message, e.line, e.column);
  }
  const tokens = tokenizeXml(input);
  const stack: { el: XmlElement; scope: Map<string, string> }[] = [];
  let root: XmlElement | null = null;

  for (const t of tokens) {
    if (t.type === 'open') {
      const rawAttrs = parseAttributes(t.raw, t.name, t.selfClosing);
      const parentScope = stack.at(-1)?.scope ?? new Map<string, string>();
      const scope = new Map(parentScope);
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawAttrs)) {
        if (k === 'xmlns') scope.set('', v);
        else if (k.startsWith('xmlns:')) scope.set(k.slice(6), v);
        else attrs[k] = v;
      }
      const [prefix, local] = splitName(t.name);
      const ns = scope.get(prefix);
      if (prefix && ns === undefined) {
        throw new XmlError(msg('xml.unboundPrefix', { prefix }), 1, 1);
      }
      const el: XmlElement = { name: t.name, local, ns: ns ?? '', attrs, children: [], text: '' };
      const parent = stack.at(-1)?.el;
      if (parent) parent.children.push(el);
      else root = el;
      if (!t.selfClosing) stack.push({ el, scope });
    } else if (t.type === 'close') {
      stack.pop();
    } else if (t.type === 'text') {
      const top = stack.at(-1);
      if (top) top.el.text += decodeXmlText(t.raw);
    } else if (t.type === 'cdata') {
      const top = stack.at(-1);
      if (top) top.el.text += t.raw.slice(9, -3);
    }
  }
  return root!;
}

/** Primeiro filho com o nome local informado. */
export function childOf(el: XmlElement | undefined, local: string): XmlElement | undefined {
  return el?.children.find((c) => c.local === local);
}

/** Todos os filhos com o nome local informado. */
export function childrenOf(el: XmlElement | undefined, local: string): XmlElement[] {
  return el ? el.children.filter((c) => c.local === local) : [];
}

/** Segue um caminho de nomes locais (`'ide/nNF'`). */
export function pathOf(el: XmlElement | undefined, path: string): XmlElement | undefined {
  let cur = el;
  for (const part of path.split('/')) cur = childOf(cur, part);
  return cur;
}

/** Texto do caminho, sem espaços nas pontas, ou `undefined` quando não existe. */
export function textOf(el: XmlElement | undefined, path: string): string | undefined {
  const t = pathOf(el, path)?.text.trim();
  return t === undefined || t === '' ? undefined : t;
}

export type XmlJson = string | { [key: string]: XmlJson | XmlJson[] };

/**
 * Converte um elemento em JSON. Elemento sem atributos e sem filhos vira o
 * próprio texto. Nos demais, atributos ficam em `@nome`, texto em `#text` e
 * filhos repetidos viram lista, na ordem do documento.
 */
export function elementToJson(el: XmlElement): XmlJson {
  const text = el.text.trim();
  const attrs = Object.entries(el.attrs);
  if (attrs.length === 0 && el.children.length === 0) return text;
  const out: { [key: string]: XmlJson | XmlJson[] } = {};
  for (const [k, v] of attrs) out[`@${k}`] = v;
  if (text) out['#text'] = text;
  for (const c of el.children) {
    const value = elementToJson(c);
    const prev = out[c.name];
    if (prev === undefined) out[c.name] = value;
    else if (Array.isArray(prev)) prev.push(value);
    else out[c.name] = [prev, value];
  }
  return out;
}

/** Documento inteiro como `{ raiz: ... }`. */
export function xmlTreeToJson(root: XmlElement): XmlJson {
  return { [root.name]: elementToJson(root) };
}
