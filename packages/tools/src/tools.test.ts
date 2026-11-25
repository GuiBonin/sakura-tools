import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  contrastRatio,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  detectUnit,
  diffTexts,
  encodeBase64,
  encodeUrl,
  formatColorAll,
  formatJson,
  formatXml,
  fromDateString,
  fromTimestamp,
  generateCnpj,
  generateCpf,
  generatePassword,
  generateQrSvg,
  generateUuids,
  hashText,
  hashesMatch,
  hmac,
  inspectUuid,
  minifyJson,
  minifyXml,
  parseColor,
  parseJson,
  parseUrl,
  passwordEntropy,
  relativeTime,
  rgbToHex,
  rgbToHsl,
  runRegex,
  strengthFromEntropy,
  uuidV4,
  uuidV7,
  validateCnpj,
  validateCpf,
  validateXml,
  wifiPayload,
} from './index';

describe('JSON', () => {
  it('formata com indentação e ordena chaves quando pedido', () => {
    const r = formatJson('{"b":1,"a":[1,2]}', 2, true);
    expect(r.ok && r.output).toBe('{\n  "a": [\n    1,\n    2\n  ],\n  "b": 1\n}');
  });

  it('minifica', () => {
    const r = minifyJson('{ "a" : 1 ,\n "b": "ç" }');
    expect(r.ok && r.output).toBe('{"a":1,"b":"ç"}');
  });

  it('informa linha e coluna do erro', () => {
    const r = parseJson('{\n  "a": 1,\n  "b": \n}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.line).toBe(4);
  });

  it('rejeita entrada vazia e acima do limite', () => {
    expect(parseJson('   ').ok).toBe(false);
    expect(parseJson('[1]', 2).ok).toBe(false);
  });

  it('preserva unicode e emoji', () => {
    const r = formatJson('{"emoji":"🌸","acento":"ação"}');
    expect(r.ok && JSON.parse(r.output)).toEqual({ emoji: '🌸', acento: 'ação' });
  });
});

describe('XML', () => {
  const nfe =
    '<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00"><NFe><infNFe Id="NFe123"><ide><cUF>35</cUF><mod>55</mod></ide><det nItem="1"><prod><xProd>Caf&#233; &amp; leite</xProd></prod></det></infNFe></NFe></nfeProc>';

  it('formata com indentação e mantém texto curto na mesma linha', () => {
    const r = formatXml(nfe);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output).toContain('\n      <ide>\n        <cUF>35</cUF>');
      expect(r.output).toContain('<xProd>Caf&#233; &amp; leite</xProd>');
    }
  });

  it('minifica e o resultado continua válido', () => {
    const formatted = formatXml(nfe);
    const r = formatted.ok ? minifyXml(formatted.output) : null;
    expect(r?.ok && r.output).toBe(nfe);
  });

  it('rejeita DOCTYPE e entidades (XXE e billion laughs)', () => {
    const xxe =
      '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>';
    const v = validateXml(xxe);
    expect(v.ok).toBe(false);
    expect(v.error?.message).toMatch(/DOCTYPE/);
    expect(validateXml('<x>&lol9;</x>').ok).toBe(false);
  });

  it('detecta tags desbalanceadas, raiz dupla e atributo repetido', () => {
    expect(validateXml('<a><b></a></b>').error?.message).toMatch(/Esperado <\/b>/);
    expect(validateXml('<a></a><b></b>').ok).toBe(false);
    expect(validateXml('<a x="1" x="2"/>').ok).toBe(false);
    expect(validateXml('<a>').ok).toBe(false);
    expect(validateXml('texto').ok).toBe(false);
  });

  it('aceita ">" dentro de atributo, comentários e CDATA', () => {
    const v = validateXml('<a t="x > y"><!-- c --><![CDATA[<b>]]></a>');
    expect(v).toMatchObject({ ok: true, rootName: 'a', elementCount: 1 });
  });

  it('informa linha do erro', () => {
    const v = validateXml('<a>\n<b>\n<!DOCTYPE x>');
    expect(v.error?.line).toBe(3);
  });

  it('limita a profundidade', () => {
    const deep = '<a>'.repeat(300) + '</a>'.repeat(300);
    expect(validateXml(deep).error?.message).toMatch(/Profundidade/);
  });
});

describe('Base64', () => {
  it('codifica e decodifica UTF-8', () => {
    expect(encodeBase64('ação 🌸')).toBe('YcOnw6NvIPCfjLg=');
    expect(decodeBase64('YcOnw6NvIPCfjLg=')).toBe('ação 🌸');
  });

  it('suporta variante URL-safe sem padding', () => {
    const safe = encodeBase64('??>>', true);
    expect(safe).not.toMatch(/[+/=]/);
    expect(decodeBase64(safe)).toBe('??>>');
  });

  it('rejeita caracteres inválidos e binário não UTF-8', () => {
    expect(() => decodeBase64('abc$')).toThrow();
    expect(() => decodeBase64('/w==')).toThrow(/UTF-8/);
    expect(base64ToBytes('/w==')).toEqual(new Uint8Array([255]));
  });
});

describe('URL', () => {
  it('codifica componente e URL completa', () => {
    expect(encodeUrl('a b&c/d')).toBe('a%20b%26c%2Fd');
    expect(encodeUrl('https://x.com/a b?q=ç', 'full')).toBe('https://x.com/a%20b?q=%C3%A7');
  });

  it('decodifica, trata + como espaço quando pedido e acusa % inválido', () => {
    expect(decodeUrl('a%20b')).toBe('a b');
    expect(decodeUrl('a+b', 'component', true)).toBe('a b');
    expect(() => decodeUrl('%E0%A4%A')).toThrow();
  });

  it('lista os parâmetros da URL', () => {
    expect(parseUrl('https://x.com/p?a=1&b=2#h')?.params).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
    expect(parseUrl('não é url')).toBeNull();
  });
});

describe('UUID', () => {
  it('gera v4 com versão e variante corretas', () => {
    const id = uuidV4();
    expect(inspectUuid(id)).toMatchObject({ valid: true, version: 4, variant: 'RFC 9562' });
  });

  it('gera v7 com timestamp recuperável e ordenável', () => {
    const t = Date.UTC(2026, 10, 25, 12);
    const id = uuidV7(t);
    expect(inspectUuid(id).timestamp?.getTime()).toBe(t);
    expect(uuidV7(t) < uuidV7(t + 1)).toBe(true);
  });

  it('gera lotes sem repetição e respeita o limite', () => {
    const ids = generateUuids(500);
    expect(new Set(ids).size).toBe(500);
    expect(generateUuids(5000)).toHaveLength(1000);
  });

  it('reconhece nil e texto inválido', () => {
    expect(inspectUuid('00000000-0000-0000-0000-000000000000').nil).toBe(true);
    expect(inspectUuid('xyz').valid).toBe(false);
  });
});

describe('Senhas', () => {
  const base = {
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
  };

  it('respeita tamanho e inclui pelo menos um de cada conjunto', () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword({ ...base, length: 8 });
      expect(p).toHaveLength(8);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it('exclui caracteres ambíguos', () => {
    const p = generatePassword({ ...base, symbols: false, excludeAmbiguous: true, length: 256 });
    expect(p).not.toMatch(/[0Oo1lI|]/);
  });

  it('rejeita configuração impossível', () => {
    expect(() =>
      generatePassword({
        ...base,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        length: 10,
      }),
    ).toThrow();
    expect(() => generatePassword({ ...base, length: 3 })).toThrow(RangeError);
    expect(() => generatePassword({ ...base, length: 257 })).toThrow(RangeError);
  });

  it('calcula entropia e classifica', () => {
    // 20 caracteres em alfabeto de 26 letras: 20 * log2(26) ≈ 94 bits
    const bits = passwordEntropy({
      ...base,
      uppercase: false,
      digits: false,
      symbols: false,
      length: 20,
    });
    expect(bits).toBeCloseTo(94, 0);
    expect(strengthFromEntropy(bits)).toBe('forte');
    expect(strengthFromEntropy(30)).toBe('muito fraca');
  });

  it('distribui de forma aproximadamente uniforme', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      for (const c of generatePassword({ ...base, uppercase: false, symbols: false, length: 50 })) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    // 10.000 caracteres em 36 símbolos: média ≈ 278. Nenhum deve ficar muito longe.
    for (const n of counts.values()) expect(n).toBeGreaterThan(150);
    expect(counts.size).toBe(36);
  });
});

describe('Cores', () => {
  it('converte HEX, RGB e HSL nas duas direções', () => {
    const c = parseColor('#D88CA5')!;
    expect(c).toEqual({ r: 216, g: 140, b: 165, a: 1 });
    expect(rgbToHex(c)).toBe('#d88ca5');
    expect(rgbToHsl(c)).toMatchObject({ h: 340.3, s: 49.4, l: 69.8 });
    expect(parseColor('hsl(340.3, 49.4%, 69.8%)')).toMatchObject({ r: 216, g: 140, b: 165 });
  });

  it('aceita formas curtas, alfa e sintaxe moderna', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#00000080')?.a).toBeCloseTo(0.502, 3);
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('rgba(10, 20, 30, 0.25)')?.a).toBe(0.25);
  });

  it('rejeita cores inválidas', () => {
    for (const bad of ['#ggg', 'rgb(300,0,0)', 'hsl(0, 120%, 50%)', 'azul', '#12345']) {
      expect(parseColor(bad)).toBeNull();
    }
  });

  it('gera todos os formatos e calcula contraste WCAG', () => {
    const all = formatColorAll(parseColor('#151218')!);
    expect(all.hex).toBe('#151218');
    expect(all.rgb).toBe('rgb(21, 18, 24)');
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBe(21);
  });
});

describe('Regex', () => {
  it('lista matches com grupos e grupos nomeados', () => {
    const r = runRegex('(?<ano>\\d{4})-(\\d{2})', 'g', 'em 2026-11 e 2027-01');
    expect(r.ok && r.matches.map((m) => m.match)).toEqual(['2026-11', '2027-01']);
    expect(r.ok && r.matches[0]?.named).toEqual({ ano: '2026' });
  });

  it('sem flag g retorna só o primeiro', () => {
    const r = runRegex('a', '', 'aaa');
    expect(r.ok && r.matches).toHaveLength(1);
  });

  it('não entra em laço com match vazio', () => {
    const r = runRegex('x*', 'g', 'abc');
    expect(r.ok && r.matches).toHaveLength(4);
  });

  it('trunca no limite e reporta padrão e flags inválidos', () => {
    const r = runRegex('a', 'g', 'a'.repeat(50), 10);
    expect(r.ok && r.truncated).toBe(true);
    expect(runRegex('(', 'g', 'x').ok).toBe(false);
    expect(runRegex('a', 'gg', 'x').ok).toBe(false);
    expect(runRegex('a', 'q', 'x').ok).toBe(false);
  });
});

describe('Diff', () => {
  it('conta linhas adicionadas e removidas', () => {
    const d = diffTexts('a\nb\nc\n', 'a\nB\nc\nd\n');
    expect(d.added).toBe(2);
    expect(d.removed).toBe(1);
    expect(d.identical).toBe(false);
  });

  it('reconhece textos iguais, também ignorando caixa', () => {
    expect(diffTexts('abc', 'abc').identical).toBe(true);
    expect(diffTexts('ABC\n', 'abc\n', 'lines', { ignoreCase: true }).identical).toBe(true);
  });

  it('compara por palavras', () => {
    const d = diffTexts('o gato preto', 'o gato branco', 'words');
    expect(d.parts.filter((p) => p.kind === 'added').map((p) => p.value)).toEqual(['branco']);
  });
});

describe('Timestamp', () => {
  it('detecta segundos e milissegundos', () => {
    expect(detectUnit('1764072000')).toBe('seconds');
    expect(detectUnit('1764072000000')).toBe('milliseconds');
  });

  it('converte nas duas direções', () => {
    expect(fromTimestamp('0').iso).toBe('1970-01-01T00:00:00.000Z');
    expect(fromTimestamp('1764072000').iso).toBe('2025-11-25T12:00:00.000Z');
    expect(fromDateString('2025-11-25T12:00:00Z').seconds).toBe(1764072000);
    expect(fromTimestamp('-86400').iso).toBe('1969-12-31T00:00:00.000Z');
  });

  it('rejeita entradas inválidas e fora do intervalo', () => {
    expect(() => fromTimestamp('abc')).toThrow();
    expect(() => fromTimestamp('99999999999999999999')).toThrow(/intervalo/);
    expect(() => fromDateString('2026-02-30T00:00:00Z')).toThrow(/inexistente/);
    expect(() => fromDateString('não é data')).toThrow();
  });

  it('descreve tempo relativo', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    expect(relativeTime(new Date('2026-01-07T00:00:00Z'), now)).toBe('há 3 dias');
    expect(relativeTime(new Date('2026-01-10T02:00:00Z'), now, 'en')).toBe('in 2 hours');
  });
});

describe('QR Code', () => {
  it('gera SVG localmente', async () => {
    const svg = await generateQrSvg('https://github.com/GuiBonin');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('#151218');
  });

  it('rejeita vazio e conteúdo grande demais', async () => {
    await expect(generateQrSvg('')).rejects.toThrow();
    await expect(generateQrSvg('x'.repeat(3000))).rejects.toThrow(/grande/);
  });

  it('monta payload de Wi-Fi escapando caracteres especiais', () => {
    expect(wifiPayload('Casa;1', 'se:nha', 'WPA')).toBe('WIFI:T:WPA;S:Casa\\;1;P:se\\:nha;;');
    expect(wifiPayload('Aberta', '', 'nopass')).toBe('WIFI:T:nopass;S:Aberta;;');
  });
});

describe('Hash', () => {
  it('SHA-256 e SHA-512 batem com vetores conhecidos', async () => {
    expect(await hashText('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await hashText('', 'SHA-512')).toMatch(/^cf83e1357eefb8bdf1542850d66d8007/);
  });

  it('HMAC-SHA256 bate com vetor conhecido', async () => {
    expect(await hmac('The quick brown fox jumps over the lazy dog', 'key')).toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('compara hashes ignorando caixa e espaços', () => {
    expect(hashesMatch('ABC def', 'abcdef')).toBe(true);
    expect(hashesMatch('', '')).toBe(false);
  });
});

describe('JWT', () => {
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('decodifica header e payload sem afirmar validade', () => {
    const d = decodeJwt(token);
    expect(d.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(d.payload.name).toBe('John Doe');
    expect(d.times.issuedAt?.toISOString()).toBe('2018-01-18T01:30:22.000Z');
    expect(d.temporal).toEqual(['no-exp']);
    expect(d).not.toHaveProperty('valid');
  });

  it('aceita prefixo Bearer', () => {
    expect(decodeJwt(`Bearer ${token}`).header.alg).toBe('HS256');
  });

  it('classifica expiração em relação ao relógio', () => {
    const mk = (p: object) =>
      `${encodeBase64('{"alg":"HS256"}', true)}.${encodeBase64(JSON.stringify(p), true)}.sig`;
    const now = new Date('2026-01-01T00:00:00Z');
    const s = now.getTime() / 1000;
    expect(decodeJwt(mk({ exp: s - 1 }), now).temporal).toEqual(['expired']);
    expect(decodeJwt(mk({ exp: s + 60 }), now).temporal).toEqual(['within-window']);
    expect(decodeJwt(mk({ nbf: s + 60, exp: s + 120 }), now).temporal).toEqual(['not-yet-valid']);
  });

  it('alerta sobre alg none e claims com tipo errado', () => {
    const t = `${encodeBase64('{"alg":"none"}', true)}.${encodeBase64('{"exp":"amanhã"}', true)}.`;
    const d = decodeJwt(t);
    expect(d.warnings.join(' ')).toMatch(/none/);
    expect(d.warnings.join(' ')).toMatch(/"exp"/);
  });

  it('explica erros de formato, incluindo JWE', () => {
    expect(() => decodeJwt('a.b')).toThrow(/3 partes/);
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(/JWE/);
    expect(() => decodeJwt('!!!.e30.x')).toThrow(/header/);
    expect(() => decodeJwt(`${encodeBase64('[1]', true)}.e30.x`)).toThrow(/objeto/);
  });
});

describe('CPF', () => {
  it('valida e formata CPF correto', () => {
    expect(validateCpf('529.982.247-25')).toEqual({
      valid: true,
      normalized: '52998224725',
      formatted: '529.982.247-25',
    });
    expect(validateCpf('52998224725').valid).toBe(true);
  });

  it('rejeita dígito errado, tamanho errado, sequência repetida e letras', () => {
    expect(validateCpf('529.982.247-26').valid).toBe(false);
    expect(validateCpf('5299822472').valid).toBe(false);
    expect(validateCpf('111.111.111-11').valid).toBe(false);
    expect(validateCpf('529.982.247-2a').valid).toBe(false);
  });

  it('gera CPFs de teste sempre válidos', () => {
    for (let i = 0; i < 200; i++) expect(validateCpf(generateCpf()).valid).toBe(true);
  });
});

describe('CNPJ', () => {
  it('valida CNPJ numérico', () => {
    expect(validateCnpj('11.222.333/0001-81')).toMatchObject({ valid: true, alphanumeric: false });
    expect(validateCnpj('11.222.333/0001-82').valid).toBe(false);
    expect(validateCnpj('00.000.000/0000-00').valid).toBe(false);
  });

  it('valida CNPJ alfanumérico (exemplo publicado pela Receita Federal)', () => {
    expect(validateCnpj('12.ABC.345/01DE-35')).toMatchObject({
      valid: true,
      alphanumeric: true,
      normalized: '12ABC34501DE35',
    });
    expect(validateCnpj('12abc34501de35').valid).toBe(true);
    expect(validateCnpj('12.ABC.345/01DE-36').valid).toBe(false);
  });

  it('exige dígitos verificadores numéricos e tamanho 14', () => {
    expect(validateCnpj('12ABC34501DE3A').valid).toBe(false);
    expect(validateCnpj('1122233300018').valid).toBe(false);
    expect(validateCnpj('11.222.333/0001-8#').valid).toBe(false);
  });

  it('gera CNPJs de teste válidos, numéricos e alfanuméricos', () => {
    for (let i = 0; i < 200; i++) {
      expect(validateCnpj(generateCnpj()).valid).toBe(true);
      expect(validateCnpj(generateCnpj({ alphanumeric: true })).valid).toBe(true);
    }
    expect(generateCnpj()).toMatch(/^\d{14}$/);
  });
});

describe('Posição de erro em JSON', () => {
  it('localiza o erro mesmo quando o motor não informa a posição', async () => {
    const { findJsonErrorOffset } = await import('./json');
    expect(findJsonErrorOffset('{"a":1,}')).toBe(7);
    expect(findJsonErrorOffset('[1, 2')).toBe(5);
    expect(findJsonErrorOffset('{"a": tru}')).toBe(6);
    expect(findJsonErrorOffset(String.raw`"\x"`)).toBe(2);
    expect(findJsonErrorOffset('{"a":1} x')).toBe(8);
    expect(findJsonErrorOffset('{"a":[1,{"b":null}],"c":-1.5e3}')).toBeNull();
  });
});

describe('CMYK', () => {
  it('converte RGB para CMYK com valores de referência', async () => {
    const { rgbToCmyk, formatCmyk } = await import('./color');
    expect(rgbToCmyk({ r: 216, g: 140, b: 165, a: 1 })).toEqual({ c: 0, m: 35, y: 24, k: 15 });
    expect(rgbToCmyk({ r: 0, g: 0, b: 0, a: 1 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(rgbToCmyk({ r: 255, g: 255, b: 255, a: 1 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    expect(rgbToCmyk({ r: 0, g: 255, b: 255, a: 1 })).toEqual({ c: 100, m: 0, y: 0, k: 0 });
    expect(formatCmyk(rgbToCmyk({ r: 146, g: 101, b: 181, a: 1 }))).toBe('cmyk(19%, 44%, 0%, 29%)');
  });

  it('converte CMYK para RGB', async () => {
    const { cmykToRgb } = await import('./color');
    expect(cmykToRgb({ c: 100, m: 0, y: 0, k: 0 })).toEqual({ r: 0, g: 255, b: 255, a: 1 });
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 100 })).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 50 })).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('ida e volta fica a no máximo 2 unidades de distância por canal', async () => {
    const { rgbToCmyk, cmykToRgb } = await import('./color');
    for (const c of [
      { r: 216, g: 140, b: 165, a: 1 },
      { r: 21, g: 18, b: 24, a: 1 },
      { r: 146, g: 101, b: 181, a: 1 },
      { r: 12, g: 200, b: 99, a: 1 },
    ]) {
      const back = cmykToRgb(rgbToCmyk(c));
      expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(2);
    }
  });

  it('aceita cmyk() na entrada, com e sem %, vírgulas ou espaços', async () => {
    const { parseCmyk } = await import('./color');
    expect(parseColor('cmyk(100%, 0%, 0%, 0%)')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
    expect(parseColor('CMYK(0 0 0 100)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseCmyk('cmyk(12.5%, 0, 0, 0)')).toEqual({ c: 12.5, m: 0, y: 0, k: 0 });
  });

  it('rejeita CMYK inválido', () => {
    for (const bad of [
      'cmyk(101%, 0, 0, 0)',
      'cmyk(0, 0, 0)',
      'cmyk(-1, 0, 0, 0)',
      'cmyk(a, 0, 0, 0)',
      'cmyk(0,0,0,0,0)',
    ]) {
      expect(parseColor(bad), bad).toBeNull();
    }
  });

  it('aparece em formatColorAll', () => {
    expect(formatColorAll(parseColor('#D88CA5')!).cmyk).toBe('cmyk(0%, 35%, 24%, 15%)');
  });
});

describe('Regressões da revisão do Codex', () => {
  it('JSON: aninhamento profundo vira erro tratado, não estouro de pilha', async () => {
    const { formatJson, minifyJson, jsonNestingDepth, JSON_MAX_DEPTH } = await import('./json');
    const deep = formatJson('['.repeat(20000));
    expect(deep.ok).toBe(false);
    if (!deep.ok) expect(deep.error.message).toMatch(/Aninhamento/);
    const valid = '['.repeat(20000) + ']'.repeat(20000);
    expect(minifyJson(valid).ok).toBe(false);
    const atLimit = '['.repeat(JSON_MAX_DEPTH) + ']'.repeat(JSON_MAX_DEPTH);
    expect(formatJson(atLimit, 0, true).ok).toBe(true);
    // colchetes dentro de string não contam
    expect(jsonNestingDepth('{"a":"[[[[[[","b":[1]}')).toBe(2);
    expect(jsonNestingDepth('"\\"[["')).toBe(0);
  });

  it('JSON: ordenar chaves preserva "__proto__"', async () => {
    const { formatJson } = await import('./json');
    const r = formatJson('{"__proto__":{"x":1},"a":2}', 0, true);
    expect(r.ok && JSON.parse(r.output)).toEqual(JSON.parse('{"__proto__":{"x":1},"a":2}'));
    expect(r.ok && r.output).toBe('{"__proto__":{"x":1},"a":2}');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('XML: minificar e formatar preservam texto em conteúdo misto', () => {
    const mixed = '<x>a <b/> b</x>';
    expect(minifyXml(mixed)).toEqual({ ok: true, output: mixed });
    expect(formatXml(mixed)).toEqual({ ok: true, output: mixed });
    const nested = '<r>\n  <p>Olá <b>mundo</b> !</p>\n  <q> espaço </q>\n</r>';
    const f = formatXml(nested);
    expect(f.ok && f.output).toBe('<r>\n  <p>Olá <b>mundo</b> !</p>\n  <q> espaço </q>\n</r>');
    const m = minifyXml(nested);
    expect(m.ok && m.output).toBe('<r><p>Olá <b>mundo</b> !</p><q> espaço </q></r>');
  });

  it('XML: recusa referência a caractere proibido, "--" em comentário e atributos colados', () => {
    expect(validateXml('<x>&#0;</x>').ok).toBe(false);
    expect(validateXml('<x>&#xD800;</x>').ok).toBe(false);
    expect(validateXml('<x>&#x110000;</x>').ok).toBe(false);
    expect(validateXml('<x>&#9;&#xE9;&#128512;</x>').ok).toBe(true);
    expect(validateXml('<x><!-- a--b --></x>').ok).toBe(false);
    expect(validateXml('<x><!-- a ---></x>').ok).toBe(false);
    expect(validateXml('<x><!-- a - b --></x>').ok).toBe(true);
    expect(validateXml('<x a="1"b="2"/>').ok).toBe(false);
    expect(validateXml('<x a="1" b=\'2\'\n c = "3" />').ok).toBe(true);
  });

  it('Senha: entropia é exata para o que o gerador produz', () => {
    const base = {
      lowercase: false,
      uppercase: false,
      digits: false,
      symbols: false,
      excludeAmbiguous: false,
    };
    // 4 caracteres com os 4 conjuntos: 22,1 bits, não 25,9
    expect(
      passwordEntropy({
        ...base,
        lowercase: true,
        uppercase: true,
        digits: true,
        symbols: true,
        length: 4,
      }),
    ).toBe(22.1);
    // a-z + 0-9, tamanho 2: 36² − 26² − 10² = 520 senhas → log2(520) ≈ 9,0
    expect(passwordEntropy({ ...base, lowercase: true, digits: true, length: 2 })).toBe(9);
    expect(passwordEntropy({ ...base, length: 10 })).toBe(0);
  });

  it('Senha: no tamanho mínimo cada conjunto aparece e todas as combinações são possíveis', () => {
    const opts = {
      lowercase: false,
      uppercase: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: false,
      length: 4,
    };
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const p = generatePassword(opts);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      seen.add(p.replace(/[A-Z]/g, 'L').replace(/\d/g, 'D'));
    }
    // 2⁴ − 2 = 14 padrões válidos de letra/dígito; o gerador antigo também os cobria,
    // mas agora com probabilidade proporcional à quantidade de senhas de cada padrão.
    expect(seen.size).toBeGreaterThanOrEqual(12);
  });

  it('Regex: match vazio com flag u não fica preso dentro de emoji', () => {
    const r = runRegex('(?:)', 'gu', '😀');
    expect(r.ok && r.matches.map((m) => m.index)).toEqual([0, 2]);
    const v = runRegex('(?:)', 'gv', 'a😀b');
    expect(v.ok && v.matches.map((m) => m.index)).toEqual([0, 1, 3, 4]);
    const plain = runRegex('(?:)', 'g', '😀');
    expect(plain.ok && plain.matches.map((m) => m.index)).toEqual([0, 1, 2]);
  });

  it('Cor: recusa números com sobras', () => {
    for (const bad of [
      'rgb(10foo, 0, 0)',
      'rgb(1e2, 0, 0)',
      'hsl(10x, 50%, 50%)',
      'rgba(0, 0, 0, 0.5px)',
      'hsl(0, 50%%, 50%)',
    ]) {
      expect(parseColor(bad), bad).toBeNull();
    }
    expect(parseColor('rgb(.5, 10.0, +3)')).toEqual({ r: 1, g: 10, b: 3, a: 1 });
    expect(parseColor('hsl(120deg 50% 50%)')).toMatchObject({ r: 64, g: 191, b: 64 });
  });

  it('UUID v7: recusa timestamp fora de 48 bits', () => {
    expect(() => uuidV7(2 ** 48)).toThrow(RangeError);
    expect(() => uuidV7(-1)).toThrow(RangeError);
    expect(() => uuidV7(1.5)).toThrow(RangeError);
    expect(inspectUuid(uuidV7(2 ** 48 - 1)).timestamp?.getTime()).toBe(2 ** 48 - 1);
    expect(inspectUuid(uuidV7(0)).timestamp?.getTime()).toBe(0);
  });
});
