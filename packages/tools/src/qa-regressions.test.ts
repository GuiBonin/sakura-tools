import { describe, expect, it } from 'vitest';
import { encodeBase64 } from './base64';
import { validateCnpj } from './brazil';
import { parseCmyk } from './color';
import { decodeJwt } from './jwt';
import { fromDateString } from './timestamp';
import { formatXml, minifyXml, validateXml } from './xml';

// Regressões da rodada de QA do Codex (25/11/2026).

const mkJwt = (p: object) =>
  `${encodeBase64('{"alg":"HS256"}', true)}.${encodeBase64(JSON.stringify(p), true)}.sig`;

describe('XML', () => {
  it('espaço sem quebra de linha entre elementos é conteúdo e fica', () => {
    const mixed = '<p><b>a</b> <i>b</i></p>';
    expect(minifyXml(mixed)).toEqual({ ok: true, output: mixed });
    expect(formatXml(mixed)).toEqual({ ok: true, output: mixed });
  });

  it('indentação (espaço com quebra de linha) continua sendo removida', () => {
    const indented = '<?xml version="1.0"?>\n<r>\n  <a>1</a>\n  <b/>\n</r>\n';
    expect(minifyXml(indented)).toEqual({
      ok: true,
      output: '<?xml version="1.0"?><r><a>1</a><b/></r>',
    });
    const f = formatXml(indented);
    expect(f.ok && f.output).toBe('<?xml version="1.0"?>\n<r>\n  <a>1</a>\n  <b/>\n</r>');
    expect(minifyXml('<?xml version="1.0"?> <r/>')).toEqual({
      ok: true,
      output: '<?xml version="1.0"?><r/>',
    });
  });

  it('referência numérica com zeros à esquerda é aceita', () => {
    expect(validateXml('<x>&#000000009;</x>').ok).toBe(true);
    expect(validateXml('<x>&#x00000009;</x>').ok).toBe(true);
    expect(validateXml(`<x>&#${'0'.repeat(50)}65;</x>`).ok).toBe(true);
    expect(validateXml('<x>&#0000;</x>').ok).toBe(false);
    expect(validateXml('<x>&#x0;</x>').ok).toBe(false);
    expect(validateXml('<x>&#99999999;</x>').ok).toBe(false);
  });
});

describe('JWT', () => {
  it('data fora da faixa gera aviso e não aparece como vigente', () => {
    const d = decodeJwt(mkJwt({ exp: 1e20, iat: -1e20 }));
    expect(d.times.expiresAt).toBeUndefined();
    expect(d.temporal).toEqual(['invalid-exp']);
    expect(d.warnings.join(' ')).toMatch(/"exp" tem um valor fora da faixa/);
    expect(d.warnings.join(' ')).toMatch(/"iat" tem um valor fora da faixa/);
  });

  it('exp como texto não é classificado como vigente', () => {
    const d = decodeJwt(mkJwt({ exp: '1700000000' }));
    expect(d.temporal).toEqual(['invalid-exp']);
    expect(d.warnings.join(' ')).toMatch(/deveria ser um número/);
  });

  it('nbf no futuro e exp no passado aparecem juntos', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const s = now.getTime() / 1000;
    expect(decodeJwt(mkJwt({ nbf: s + 60, exp: s - 60 }), now).temporal).toEqual([
      'not-yet-valid',
      'expired',
    ]);
    expect(decodeJwt(mkJwt({ nbf: s + 60 }), now).temporal).toEqual(['not-yet-valid', 'no-exp']);
    expect(decodeJwt(mkJwt({ nbf: s + 60, exp: s + 120 }), now).temporal).toEqual([
      'not-yet-valid',
    ]);
  });
});

describe('Timestamp', () => {
  it('data impossível é erro, não é ajustada', () => {
    for (const bad of [
      '2026-02-30',
      '2025-02-29T10:00:00Z',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '1900-02-29T00:00:00Z',
    ]) {
      expect(() => fromDateString(bad), bad).toThrow(/inexistente/);
    }
  });

  it('horário impossível é erro', () => {
    expect(() => fromDateString('2026-01-01T24:00:00Z')).toThrow(/Horário/);
    expect(() => fromDateString('2026-01-01T10:60:00Z')).toThrow(/Horário/);
    expect(() => fromDateString('2026-01-01T10:00:60Z')).toThrow(/Horário/);
  });

  it('anos bissextos válidos continuam aceitos', () => {
    expect(fromDateString('2024-02-29T00:00:00Z').iso).toBe('2024-02-29T00:00:00.000Z');
    expect(fromDateString('2000-02-29T00:00:00Z').iso).toBe('2000-02-29T00:00:00.000Z');
    expect(fromDateString('2026-11-25T14:30:00-03:00').iso).toBe('2026-11-25T17:30:00.000Z');
  });
});

describe('CMYK', () => {
  it('recusa componente vazio e separadores misturados', () => {
    for (const bad of [
      'cmyk(0,,0,0,0)',
      'cmyk(0,0,0,)',
      'cmyk(,0,0,0)',
      'cmyk()',
      'cmyk(0 0,0 0)',
    ]) {
      expect(parseCmyk(bad), bad).toBeNull();
    }
  });

  it('aceita vírgulas ou espaços com folga', () => {
    expect(parseCmyk('cmyk( 1 , 2 , 3 , 4 )')).toEqual({ c: 1, m: 2, y: 3, k: 4 });
    expect(parseCmyk('cmyk(1% 2% 3% 4%)')).toEqual({ c: 1, m: 2, y: 3, k: 4 });
  });
});

describe('CNPJ', () => {
  it('raiz e ordem com um caractere só são recusadas, também com letras', () => {
    expect(validateCnpj('AAAAAAAAAAAA45').valid).toBe(false);
    expect(validateCnpj('aaaaaaaaaaaa45').valid).toBe(false);
    expect(validateCnpj('00000000000000').valid).toBe(false);
    expect(validateCnpj('11111111111180').valid).toBe(false);
    expect(validateCnpj('12.ABC.345/01DE-35').valid).toBe(true);
    expect(validateCnpj('11.222.333/0001-81').valid).toBe(true);
  });
});

describe('XML: elemento sem filhos', () => {
  it('minificar mantém espaço e quebra de linha que são o conteúdo do elemento', () => {
    expect(minifyXml('<x>\n  </x>')).toEqual({ ok: true, output: '<x>\n  </x>' });
    expect(minifyXml('<x><a>\n </a><b/></x>')).toEqual({
      ok: true,
      output: '<x><a>\n </a><b/></x>',
    });
    expect(minifyXml('<x>\n  <!-- c -->\n</x>')).toEqual({ ok: true, output: '<x>\n  \n</x>' });
    // indentação entre elementos continua saindo
    expect(minifyXml('<x>\n  <a/>\n</x>')).toEqual({ ok: true, output: '<x><a/></x>' });
  });
});

describe('diffToText', () => {
  it('linhas viram "+ ", "- " e "  "', async () => {
    const { diffTexts, diffToText } = await import('./diff');
    const d = diffTexts('a\nb\nc\n', 'a\nB\nc\nd\n');
    expect(diffToText(d.parts, 'lines')).toBe('  a\n- b\n+ B\n  c\n+ d');
  });

  it('palavras e caracteres usam a marcação do git word-diff', async () => {
    const { diffTexts, diffToText } = await import('./diff');
    const d = diffTexts('o gato preto', 'o gato branco', 'words');
    expect(diffToText(d.parts, 'words')).toBe('o gato [-preto-]{+branco+}');
    const c = diffTexts('casa', 'caso', 'chars');
    expect(diffToText(c.parts, 'chars')).toBe('cas[-a-]{+o+}');
  });

  it('textos iguais e vazios', async () => {
    const { diffTexts, diffToText } = await import('./diff');
    expect(diffToText(diffTexts('x\n', 'x\n').parts, 'lines')).toBe('  x');
    expect(diffToText(diffTexts('', '').parts, 'lines')).toBe('');
    expect(diffToText(diffTexts('sem quebra', 'sem quebra').parts, 'lines')).toBe('  sem quebra');
  });
});
