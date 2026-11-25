export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0 a 1 */
  a: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/** Aceita #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla() e cmyk(). */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  if (s.startsWith('cmyk')) {
    const cmyk = parseCmyk(s);
    return cmyk ? cmykToRgb(cmyk) : null;
  }
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4)
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255, 3) : 1,
    };
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
  if (alpha === null) return null;

  if (fn[1]!.startsWith('rgb')) {
    const ch = parts
      .slice(0, 3)
      .map((p) => (p.endsWith('%') ? (strictNumber(p.slice(0, -1)) / 100) * 255 : strictNumber(p)));
    if (ch.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
    return { r: Math.round(ch[0]!), g: Math.round(ch[1]!), b: Math.round(ch[2]!), a: alpha };
  }
  const h = strictNumber(parts[0]!.replace(/deg$/, ''));
  const sat = strictNumber(parts[1]!.replace(/%$/, ''));
  const light = strictNumber(parts[2]!.replace(/%$/, ''));
  if (![h, sat, light].every(Number.isFinite) || sat < 0 || sat > 100 || light < 0 || light > 100) {
    return null;
  }
  return hslToRgb({ h, s: sat, l: light, a: alpha });
}

function parseAlpha(p: string): number | null {
  const n = p.endsWith('%') ? strictNumber(p.slice(0, -1)) / 100 : strictNumber(p);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

/**
 * Número decimal sem sobras. `parseFloat('10foo')` dá 10; aqui dá NaN,
 * para que "rgb(10foo, 0, 0)" seja recusado em vez de virar rgb(10, 0, 0).
 */
function strictNumber(p: string): number {
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(p) ? Number(p) : NaN;
}

export function rgbToHex({ r, g, b, a }: Rgb): string {
  const h = [r, g, b]
    .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'))
    .join('');
  return a < 1
    ? `#${h}${Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')}`
    : `#${h}`;
}

export function rgbToHsl({ r, g, b, a }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1), a };
}

export function hslToRgb({ h, s, l, a }: Hsl): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v, a };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const conv = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(conv(hn + 1 / 3) * 255),
    g: Math.round(conv(hn) * 255),
    b: Math.round(conv(hn - 1 / 3) * 255),
    a,
  };
}

export function formatRgb({ r, g, b, a }: Rgb): string {
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${round(a, 3)})` : `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl({ h, s, l, a }: Hsl): string {
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${round(a, 3)})` : `hsl(${h}, ${s}%, ${l}%)`;
}

/** Luminância relativa (WCAG 2.x). */
export function luminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Razão de contraste WCAG entre duas cores opacas. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return round((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
}

/** CMYK em porcentagem (0 a 100). */
export interface Cmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

/**
 * Conversão RGB → CMYK pela fórmula simples, sem perfil de cor (ICC).
 * Serve como referência de tela. Para impressão o resultado real depende
 * do perfil da gráfica (ex.: FOGRA39, GRACoL), que esta conta não considera.
 * A transparência (alfa) é ignorada.
 */
export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const part = (v: number) => Math.round(((1 - v - k) / (1 - k)) * 100);
  return { c: part(rn), m: part(gn), y: part(bn), k: Math.round(k * 100) };
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
  const kn = 1 - k / 100;
  const ch = (v: number) => Math.round(255 * (1 - v / 100) * kn);
  return { r: ch(c), g: ch(m), b: ch(y), a: 1 };
}

export function formatCmyk({ c, m, y, k }: Cmyk): string {
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

/** Aceita `cmyk(0%, 35%, 24%, 15%)`, com ou sem `%`, valores de 0 a 100. */
export function parseCmyk(input: string): Cmyk | null {
  const m = /^cmyk\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!m) return null;
  // Ou tudo separado por vírgula, ou tudo por espaço. "0,,0,0,0" tem componente vazio.
  const inner = m[1]!.trim();
  const parts = inner.includes(',') ? inner.split(',').map((p) => p.trim()) : inner.split(/\s+/);
  if (parts.length !== 4 || parts.some((p) => p === '')) return null;
  const values = parts.map((p) => (/^\d+(\.\d+)?%?$/.test(p) ? parseFloat(p) : NaN));
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) return null;
  const [c, mm, y, k] = values as [number, number, number, number];
  return { c, m: mm, y, k };
}

export function formatColorAll(rgb: Rgb): { hex: string; rgb: string; hsl: string; cmyk: string } {
  return {
    hex: rgbToHex(rgb),
    rgb: formatRgb(rgb),
    hsl: formatHsl(rgbToHsl(rgb)),
    cmyk: formatCmyk(rgbToCmyk(rgb)),
  };
}
