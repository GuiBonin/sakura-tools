/**
 * Formatador e validador estrutural de XML.
 *
 * Usa um tokenizador próprio em vez de DOMParser para rodar igual no
 * navegador, em Web Worker e no Node, e para ter controle de segurança:
 * DOCTYPE e declarações de entidade são rejeitados. Isso elimina XXE e
 * "billion laughs" na origem, porque nenhuma entidade customizada é expandida.
 */

export const XML_MAX_INPUT = 10 * 1024 * 1024;
export const XML_MAX_DEPTH = 256;

export type XmlToken =
  | { type: 'declaration'; raw: string }
  | { type: 'comment'; raw: string }
  | { type: 'cdata'; raw: string }
  | { type: 'pi'; raw: string }
  | { type: 'open'; name: string; raw: string; selfClosing: boolean }
  | { type: 'close'; name: string; raw: string }
  | { type: 'text'; raw: string };

export class XmlError extends Error {
  override name = 'XmlError';
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(message);
  }
}

const NAME_RE = /^[A-Za-z_:][\w.\-:]*$/;
const PREDEFINED_ENTITIES = new Set(['lt', 'gt', 'amp', 'apos', 'quot']);

export function tokenizeXml(input: string, maxLength = XML_MAX_INPUT): XmlToken[] {
  if (input.length > maxLength) {
    throw new XmlError(`Documento maior que o limite de ${maxLength} caracteres.`, 1, 1);
  }
  const tokens: XmlToken[] = [];
  let i = 0;
  const pos = (offset: number) => lineColumn(input, offset);

  while (i < input.length) {
    if (input[i] !== '<') {
      const end = input.indexOf('<', i);
      const raw = input.slice(i, end === -1 ? input.length : end);
      checkEntities(raw, i, input);
      tokens.push({ type: 'text', raw });
      i = end === -1 ? input.length : end;
      continue;
    }

    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      if (end === -1) throw new XmlError('Comentário não fechado.', ...pos(i));
      const body = input.slice(i + 4, end);
      // XML 1.0 §2.5: "--" não pode aparecer dentro do comentário nem antes do "-->".
      if (body.includes('--') || body.endsWith('-')) {
        throw new XmlError('Comentário não pode conter "--".', ...pos(i));
      }
      tokens.push({ type: 'comment', raw: input.slice(i, end + 3) });
      i = end + 3;
    } else if (input.startsWith('<![CDATA[', i)) {
      const end = input.indexOf(']]>', i + 9);
      if (end === -1) throw new XmlError('Bloco CDATA não fechado.', ...pos(i));
      tokens.push({ type: 'cdata', raw: input.slice(i, end + 3) });
      i = end + 3;
    } else if (input.startsWith('<!', i)) {
      // DOCTYPE, ENTITY, ELEMENT etc. Documentos fiscais não usam DTD.
      throw new XmlError(
        'DOCTYPE e declarações de entidade não são aceitos por segurança (XXE e expansão de entidades).',
        ...pos(i),
      );
    } else if (input.startsWith('<?', i)) {
      const end = input.indexOf('?>', i + 2);
      if (end === -1) throw new XmlError('Instrução de processamento não fechada.', ...pos(i));
      const raw = input.slice(i, end + 2);
      const isDecl = /^<\?xml\s/i.test(raw);
      if (isDecl && tokens.some((t) => t.type !== 'text' || t.raw.trim() !== '')) {
        throw new XmlError('A declaração <?xml ?> só pode aparecer no início.', ...pos(i));
      }
      tokens.push({ type: isDecl ? 'declaration' : 'pi', raw });
      i = end + 2;
    } else if (input[i + 1] === '/') {
      const end = input.indexOf('>', i);
      if (end === -1) throw new XmlError('Tag de fechamento incompleta.', ...pos(i));
      const name = input.slice(i + 2, end).trim();
      if (!NAME_RE.test(name)) throw new XmlError(`Nome de tag inválido: "${name}".`, ...pos(i));
      tokens.push({ type: 'close', name, raw: `</${name}>` });
      i = end + 1;
    } else {
      const end = findTagEnd(input, i);
      if (end === -1) throw new XmlError('Tag de abertura incompleta.', ...pos(i));
      const raw = input.slice(i, end + 1);
      const selfClosing = raw.endsWith('/>');
      const body = raw.slice(1, selfClosing ? -2 : -1);
      const nameMatch = /^[^\s/>]+/.exec(body);
      const name = nameMatch?.[0] ?? '';
      if (!NAME_RE.test(name)) throw new XmlError(`Nome de tag inválido: "${name}".`, ...pos(i));
      checkAttributes(body.slice(name.length), i, input);
      tokens.push({ type: 'open', name, raw, selfClosing });
      i = end + 1;
    }
  }
  return tokens;
}

/** Acha o `>` que fecha a tag, ignorando `>` dentro de valores de atributo. */
function findTagEnd(input: string, start: number): number {
  let quote: string | null = null;
  for (let j = start + 1; j < input.length; j++) {
    const ch = input[j];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '<') {
      return -1;
    } else if (ch === '>') {
      return j;
    }
  }
  return -1;
}

function checkAttributes(attrs: string, offset: number, input: string) {
  // Cada atributo precisa de espaço antes: `a="1"b="2"` é malformado.
  const re = /\s+([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')|\s*(\S)/gy;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs)) !== null) {
    if (m[5] !== undefined) {
      throw new XmlError('Atributo malformado.', ...lineColumn(input, offset));
    }
    const name = m[1] ?? '';
    if (!NAME_RE.test(name)) {
      throw new XmlError(`Nome de atributo inválido: "${name}".`, ...lineColumn(input, offset));
    }
    if (seen.has(name)) {
      throw new XmlError(`Atributo repetido: "${name}".`, ...lineColumn(input, offset));
    }
    seen.add(name);
    const value = m[3] ?? m[4] ?? '';
    if (value.includes('<')) {
      throw new XmlError('Valor de atributo não pode conter "<".', ...lineColumn(input, offset));
    }
    checkEntities(value, offset, input);
  }
}

function checkEntities(text: string, offset: number, input: string) {
  const re = /&([^;\s&]*);?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const ref = m[1] ?? '';
    const closed = m[0].endsWith(';');
    const ok = closed && (PREDEFINED_ENTITIES.has(ref) || isValidCharRef(ref));
    if (!ok) {
      throw new XmlError(
        `Referência de entidade inválida ou não suportada: "${m[0]}".`,
        ...lineColumn(input, offset + m.index),
      );
    }
  }
}

/**
 * Referência numérica (`#233`, `#xE9`) que aponta para um caractere permitido
 * no XML 1.0 (§2.2): tab, LF, CR, U+0020–U+D7FF, U+E000–U+FFFD, U+10000–U+10FFFF.
 * `&#0;` e substitutos isolados são inválidos.
 */
function isValidCharRef(ref: string): boolean {
  // Zeros à esquerda são válidos (`&#0009;`). O limite de dígitos vale depois
  // de removê-los, só para não converter números gigantes.
  let code: number;
  const dec = /^#0*(\d{1,7})$/.exec(ref);
  const hex = /^#x0*([0-9a-fA-F]{1,6})$/.exec(ref);
  if (dec) code = Number(dec[1]);
  else if (hex) code = parseInt(hex[1]!, 16);
  else return false;
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}

function lineColumn(text: string, offset: number): [number, number] {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else col++;
  }
  return [line, col];
}

export interface XmlValidation {
  ok: boolean;
  error?: { message: string; line: number; column: number };
  rootName?: string;
  elementCount: number;
  maxDepth: number;
}

/** Valida boa formação: tags balanceadas, raiz única, sem texto fora da raiz. */
export function validateXml(input: string): XmlValidation {
  try {
    const tokens = tokenizeXml(input);
    const stack: string[] = [];
    let rootName: string | undefined;
    let rootClosed = false;
    let elementCount = 0;
    let maxDepth = 0;
    for (const t of tokens) {
      if (t.type === 'open') {
        if (rootClosed) throw new XmlError('Mais de um elemento raiz.', 1, 1);
        rootName ??= t.name;
        elementCount++;
        if (!t.selfClosing) {
          stack.push(t.name);
          maxDepth = Math.max(maxDepth, stack.length);
          if (stack.length > XML_MAX_DEPTH) {
            throw new XmlError(`Profundidade maior que ${XML_MAX_DEPTH} níveis.`, 1, 1);
          }
        } else if (stack.length === 0) rootClosed = true;
      } else if (t.type === 'close') {
        const expected = stack.pop();
        if (expected !== t.name) {
          throw new XmlError(
            expected
              ? `Esperado </${expected}>, encontrado </${t.name}>.`
              : `Fechamento </${t.name}> sem abertura.`,
            1,
            1,
          );
        }
        if (stack.length === 0) rootClosed = true;
      } else if ((t.type === 'text' || t.type === 'cdata') && stack.length === 0) {
        if (t.type === 'cdata' || t.raw.trim() !== '') {
          throw new XmlError('Conteúdo fora do elemento raiz.', 1, 1);
        }
      }
    }
    if (stack.length > 0) throw new XmlError(`Tag <${stack.at(-1)}> não fechada.`, 1, 1);
    if (!rootName) throw new XmlError('Nenhum elemento encontrado.', 1, 1);
    return { ok: true, rootName, elementCount, maxDepth };
  } catch (err) {
    if (err instanceof XmlError) {
      return {
        ok: false,
        error: { message: err.message, line: err.line, column: err.column },
        elementCount: 0,
        maxDepth: 0,
      };
    }
    throw err;
  }
}

export type XmlFormatResult =
  | { ok: true; output: string }
  | { ok: false; error: { message: string; line: number; column: number } };

interface ElementInfo {
  /** Índice do token de fechamento. */
  close: number;
  /** Tem texto ou CDATA não vazio como filho direto. */
  hasText: boolean;
  /** Tem elemento como filho direto. */
  hasChild: boolean;
}

/**
 * Uma passada sobre tokens já validados: para cada abertura, onde fecha e
 * que tipo de conteúdo tem; para cada texto, qual elemento o contém.
 */
function analyze(tokens: XmlToken[]) {
  const elements = new Map<number, ElementInfo>();
  const parentOf = new Map<number, number>();
  const stack: number[] = [];
  tokens.forEach((t, k) => {
    const parent = stack.at(-1);
    if (t.type === 'open') {
      if (parent !== undefined) elements.get(parent)!.hasChild = true;
      if (!t.selfClosing) {
        elements.set(k, { close: -1, hasText: false, hasChild: false });
        stack.push(k);
      }
    } else if (t.type === 'close') {
      elements.get(stack.pop()!)!.close = k;
    } else if (t.type === 'text' || t.type === 'cdata') {
      if (parent !== undefined) {
        parentOf.set(k, parent);
        if (isSignificantText(t)) elements.get(parent)!.hasText = true;
      }
    }
  });
  return { elements, parentOf };
}

/**
 * Texto que faz parte do conteúdo: CDATA, texto com algum caractere visível,
 * ou espaço sem quebra de linha (como o espaço em `<b>a</b> <i>b</i>`).
 * Só espaço com quebra de linha é tratado como indentação, porque é assim
 * que indentação sempre aparece.
 */
function isSignificantText(t: XmlToken): boolean {
  if (t.type === 'cdata') return true;
  if (t.type !== 'text') return false;
  return t.raw.trim() !== '' || !/[\r\n]/.test(t.raw);
}

/**
 * Formata com indentação sem alterar conteúdo. Só espaço com quebra de linha
 * entre elementos é tratado como indentação (ver isSignificantText).
 * Elementos com texto, como `<xProd>Café</xProd>` ou conteúdo misto
 * `<p>a <b/> b</p>`, saem numa linha só e exatamente como vieram.
 */
export function formatXml(input: string, indent = '  '): XmlFormatResult {
  const validation = validateXml(input);
  if (!validation.ok && validation.error) return { ok: false, error: validation.error };
  const tokens = tokenizeXml(input);
  const { elements } = analyze(tokens);
  const lines: string[] = [];
  let depth = 0;

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!;
    const pad = indent.repeat(depth);
    switch (t.type) {
      case 'text': {
        // Fora de elemento com texto, só sobra espaço de indentação.
        if (t.raw.trim()) lines.push(pad + t.raw.trim());
        break;
      }
      case 'open': {
        const info = t.selfClosing ? undefined : elements.get(k);
        if (!info) {
          lines.push(pad + t.raw);
        } else if (info.hasText || !info.hasChild) {
          lines.push(
            pad +
              tokens
                .slice(k, info.close + 1)
                .map((x) => x.raw)
                .join(''),
          );
          k = info.close;
        } else {
          lines.push(pad + t.raw);
          depth++;
        }
        break;
      }
      case 'close':
        depth = Math.max(0, depth - 1);
        lines.push(indent.repeat(depth) + t.raw);
        break;
      default:
        lines.push(pad + t.raw);
    }
  }
  return { ok: true, output: lines.join('\n') };
}

export function minifyXml(input: string): XmlFormatResult {
  const validation = validateXml(input);
  if (!validation.ok && validation.error) return { ok: false, error: validation.error };
  const tokens = tokenizeXml(input);
  const { elements, parentOf } = analyze(tokens);
  // Remove comentários e espaços de indentação. Texto significativo, e qualquer
  // texto dentro de elemento com conteúdo misto, fica intacto.
  const out = tokens
    .map((t, k) => {
      if (t.type === 'comment') return '';
      if (t.type !== 'text' || t.raw.trim() !== '') return t.raw;
      const parent = parentOf.get(k);
      // Espaço fora do elemento raiz nunca é conteúdo.
      if (parent === undefined) return '';
      const info = elements.get(parent)!;
      // Elemento sem filhos: o espaço é o próprio conteúdo (`<x>\n  </x>`), não
      // indentação. Indentação só existe entre elementos.
      return isSignificantText(t) || info.hasText || !info.hasChild ? t.raw : '';
    })
    .join('');
  return { ok: true, output: out };
}
