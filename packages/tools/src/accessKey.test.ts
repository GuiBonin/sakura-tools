import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY_LAYOUT,
  accessKeyCheckDigit,
  buildAccessKey,
  formatAccessKey,
  generateAccessKey,
  normalizeAccessKey,
  validateAccessKey,
  WEAK_CNF,
  type AccessKeyResult,
} from './accessKey';
import { generateCnpj, validateCnpj, validateCpf } from './brazil';
import { formatMessage } from './messages';

// DVs de referência calculados à parte, com uma cópia direta do exemplo em
// Visual Basic do Anexo II da NT 2025.001 (não com o código deste módulo).
const NUMERIC = '35261111222333000181550010000001231482719344';
const ALPHA = '35260812ABC34501DE35550010000001231482719348';
const CPF_WEAK_CNF = '43261100052998224725650010000000451123456785';

const NOW = new Date(2026, 10, 26); // 26/11/2026

const codes = (r: AccessKeyResult, kind: 'errors' | 'warnings' = 'errors') =>
  r[kind].map((i) => i.message.code);

/** Troca os caracteres a partir da posição (1 a 44) e recalcula o DV. */
function patch(key: string, position: number, value: string): string {
  const k = key.slice(0, position - 1) + value + key.slice(position - 1 + value.length);
  return k.slice(0, 43) + accessKeyCheckDigit(k.slice(0, 43));
}

describe('accessKeyCheckDigit', () => {
  it('confere com os valores de referência', () => {
    expect(accessKeyCheckDigit(NUMERIC.slice(0, 43))).toBe('4');
    expect(accessKeyCheckDigit(ALPHA.slice(0, 43))).toBe('8');
    expect(accessKeyCheckDigit(CPF_WEAK_CNF.slice(0, 43))).toBe('5');
    expect(accessKeyCheckDigit('1'.repeat(43))).toBe('2');
  });

  it('resto 0 ou 1 vira DV 0', () => {
    // Soma 0 dá 11 − 0 = 11, que vira 0.
    expect(accessKeyCheckDigit('0'.repeat(43))).toBe('0');
    // Achar uma chave com resto 1 (11 − 1 = 10, que vira 0).
    const base = NUMERIC.slice(0, 35);
    const hit = Array.from({ length: 100 }, (_, i) => base + String(i).padStart(8, '0')).find(
      (k) => {
        let sum = 0;
        let w = 2;
        for (let i = 42; i >= 0; i--) {
          sum += (k.charCodeAt(i) - 48) * w;
          w = w === 9 ? 2 : w + 1;
        }
        return sum % 11 === 1;
      },
    );
    expect(hit).toBeDefined();
    expect(accessKeyCheckDigit(hit!)).toBe('0');
  });

  it('recusa tamanho ou caractere errado', () => {
    expect(() => accessKeyCheckDigit('1'.repeat(42))).toThrow(TypeError);
    expect(() => accessKeyCheckDigit('a'.repeat(43))).toThrow(TypeError);
  });
});

describe('normalizeAccessKey e formatAccessKey', () => {
  it('tira espaços, pontos e traços e põe em maiúsculas', () => {
    expect(normalizeAccessKey(' 3526 0812ab c345.01de-35 ')).toBe('35260812ABC34501DE35');
  });

  it('remove o prefixo NFe do atributo Id', () => {
    expect(normalizeAccessKey(`NFe${NUMERIC}`)).toBe(NUMERIC);
    // Só quando sobram 44 caracteres.
    expect(normalizeAccessKey('NFe123')).toBe('NFE123');
  });

  it('formata em 11 grupos de 4', () => {
    const f = formatAccessKey(NUMERIC);
    expect(f.split(' ')).toHaveLength(11);
    expect(f).toBe('3526 1111 2223 3300 0181 5500 1000 0001 2314 8271 9344');
  });
});

describe('validateAccessKey: chaves válidas', () => {
  it('NF-e com CNPJ numérico, campo a campo', () => {
    const r = validateAccessKey(NUMERIC, { now: NOW });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.valid).toBe(true);
    expect(r.expectedDv).toBe('4');
    expect(r.parts).toEqual({
      cUF: '35',
      uf: 'SP',
      aamm: '2611',
      year: 2026,
      month: 11,
      emitter: '11222333000181',
      emitterType: 'cnpj',
      emitterFormatted: '11.222.333/0001-81',
      alphanumeric: false,
      mod: '55',
      modelName: 'NF-e',
      serie: '001',
      nNF: '000000123',
      tpEmis: '1',
      cNF: '48271934',
      cDV: '4',
    });
  });

  it('aceita a chave formatada como no DANFE e com prefixo NFe', () => {
    expect(validateAccessKey(formatAccessKey(NUMERIC), { now: NOW }).valid).toBe(true);
    expect(validateAccessKey(`NFe${NUMERIC}`, { now: NOW }).valid).toBe(true);
  });

  it('CNPJ alfanumérico (exemplo da Receita) em agosto de 2026', () => {
    const r = validateAccessKey(ALPHA, { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.parts?.alphanumeric).toBe(true);
    expect(r.parts?.emitterFormatted).toBe('12.ABC.345/01DE-35');
    expect(r.warnings).toEqual([]);
  });

  it('aceita letras minúsculas no CNPJ', () => {
    expect(validateAccessKey(ALPHA.toLowerCase(), { now: NOW }).valid).toBe(true);
  });

  it('emitente com CPF (três zeros e o CPF)', () => {
    const key = patch(CPF_WEAK_CNF, 36, '48271934');
    const r = validateAccessKey(key, { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.parts?.emitterType).toBe('cpf');
    expect(r.parts?.emitterFormatted).toBe('529.982.247-25');
    expect(r.parts?.modelName).toBe('NFC-e');
    expect(r.parts?.uf).toBe('RS');
  });

  it.each(['1', '2', '4', '5', '6', '7'])('tpEmis %s numa NF-e é aceito sem aviso', (tp) => {
    const r = validateAccessKey(patch(NUMERIC, 35, tp), { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it('tpEmis 9 numa NFC-e é aceito sem aviso', () => {
    const key = patch(patch(NUMERIC, 21, '65'), 35, '9');
    const r = validateAccessKey(key, { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it('cada campo cai na posição do layout', () => {
    const total = ACCESS_KEY_LAYOUT.reduce((n, f) => n + f.size, 0);
    expect(total).toBe(44);
    let pos = 1;
    for (const f of ACCESS_KEY_LAYOUT) {
      expect(f.start).toBe(pos);
      pos += f.size;
    }
  });
});

describe('validateAccessKey: forma da chave', () => {
  it('caractere proibido', () => {
    const r = validateAccessKey(`${NUMERIC.slice(0, 43)}*`);
    expect(r.valid).toBe(false);
    expect(r.parts).toBeNull();
    expect(codes(r)).toEqual(['accessKey.badChars']);
  });

  it.each([0, 43, 45])('tamanho %i', (n) => {
    const r = validateAccessKey('1'.repeat(n));
    expect(codes(r)).toEqual(['accessKey.badLength']);
    expect(r.errors[0]?.message.params).toEqual({ count: n });
  });

  it.each([
    ['na UF', 1],
    ['no DV do CNPJ (posição 19)', 19],
    ['no número da nota', 30],
    ['no DV da chave', 44],
  ])('letra %s é recusada', (_, position) => {
    const key = NUMERIC.slice(0, position - 1) + 'A' + NUMERIC.slice(position);
    expect(codes(validateAccessKey(key))).toEqual(['accessKey.lettersOutsideCnpj']);
  });
});

describe('validateAccessKey: campos', () => {
  it('DV errado mostra o esperado e o informado', () => {
    const r = validateAccessKey(`${NUMERIC.slice(0, 43)}5`, { now: NOW });
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual([
      { field: 'cDV', message: { code: 'accessKey.badDv', params: { expected: '4', found: '5' } } },
    ]);
  });

  it('um dígito trocado no meio é pego pelo DV', () => {
    const key = NUMERIC.slice(0, 30) + '9' + NUMERIC.slice(31);
    expect(codes(validateAccessKey(key, { now: NOW }))).toContain('accessKey.badDv');
  });

  it.each(['00', '10', '20', '34', '54', '91', '99'])('UF %s não existe', (uf) => {
    const r = validateAccessKey(patch(NUMERIC, 1, uf), { now: NOW });
    expect(r.errors).toEqual([
      { field: 'cUF', message: { code: 'accessKey.badUf', params: { code: uf } } },
    ]);
    expect(r.parts?.uf).toBeNull();
  });

  it.each(['00', '13'])('mês %s não existe', (mm) => {
    const r = validateAccessKey(patch(NUMERIC, 5, mm), { now: NOW });
    expect(codes(r)).toEqual(['accessKey.badMonth']);
  });

  it('mês futuro é só aviso', () => {
    const r = validateAccessKey(patch(NUMERIC, 3, '2612'), { now: NOW });
    expect(r.valid).toBe(true);
    expect(codes(r, 'warnings')).toEqual(['accessKey.futureDate']);
    expect(r.warnings[0]?.message.params).toEqual({ aamm: '12/2026' });
  });

  it('o mês atual não é futuro', () => {
    expect(validateAccessKey(NUMERIC, { now: new Date(2026, 10, 1) }).warnings).toEqual([]);
  });

  it('CNPJ numérico com DV errado e que não é CPF', () => {
    const r = validateAccessKey(patch(NUMERIC, 7, '11222333000182'), { now: NOW });
    expect(r.errors).toEqual([
      {
        field: 'emitter',
        message: { code: 'accessKey.emitterInvalid', params: { value: '11222333000182' } },
      },
    ]);
    expect(r.parts?.emitterType).toBeNull();
  });

  it('CNPJ alfanumérico com DV errado tem mensagem própria', () => {
    const r = validateAccessKey(patch(ALPHA, 7, '12ABC34501DE36'), { now: NOW });
    expect(codes(r)).toEqual(['accessKey.cnpjInvalid']);
  });

  it('CNPJ só de zeros não é aceito', () => {
    expect(codes(validateAccessKey(patch(NUMERIC, 7, '0'.repeat(14)), { now: NOW }))).toEqual([
      'accessKey.emitterInvalid',
    ]);
  });

  it('CNPJ alfanumérico antes de julho de 2026 é aviso', () => {
    const r = validateAccessKey(patch(ALPHA, 3, '2606'), { now: NOW });
    expect(r.valid).toBe(true);
    expect(codes(r, 'warnings')).toEqual(['accessKey.alphanumericBeforeStart']);
    expect(validateAccessKey(patch(ALPHA, 3, '2607'), { now: NOW }).warnings).toEqual([]);
  });

  it('CNPJ válido que também é CPF com zeros gera aviso de ambiguidade', () => {
    // CPF 478.230.859-09 com três zeros também passa como CNPJ 00.047.823/0859-09.
    // Achado por busca à parte, conferido nos dois validadores abaixo.
    const emitter = '00047823085909';
    expect(validateCpf(emitter.slice(3)).valid).toBe(true);
    expect(validateCnpj(emitter).valid).toBe(true);
    const r = validateAccessKey(patch(NUMERIC, 7, emitter), { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.parts?.emitterType).toBe('cnpj');
    expect(codes(r, 'warnings')).toEqual(['accessKey.emitterAmbiguous']);
  });

  it('número da nota zero', () => {
    expect(codes(validateAccessKey(patch(NUMERIC, 26, '000000000'), { now: NOW }))).toEqual([
      'accessKey.zeroNumber',
    ]);
  });

  it.each(['0', '8'])('tpEmis %s não existe', (tp) => {
    expect(codes(validateAccessKey(patch(NUMERIC, 35, tp), { now: NOW }))).toEqual([
      'accessKey.badTpEmis',
    ]);
  });

  it('tpEmis 3 (SCAN) é aviso', () => {
    const r = validateAccessKey(patch(NUMERIC, 35, '3'), { now: NOW });
    expect(r.valid).toBe(true);
    expect(codes(r, 'warnings')).toEqual(['accessKey.scanDisabled']);
  });

  it('tpEmis 9 numa NF-e é aviso', () => {
    const r = validateAccessKey(patch(NUMERIC, 35, '9'), { now: NOW });
    expect(r.valid).toBe(true);
    expect(codes(r, 'warnings')).toEqual(['accessKey.offlineOnlyNfce']);
  });

  it('todos os cNF da lista da regra B03-10 são recusados', () => {
    expect(WEAK_CNF.size).toBe(20);
    for (const cnf of WEAK_CNF) {
      const r = validateAccessKey(patch(NUMERIC, 36, cnf), { now: NOW });
      expect(codes(r)).toEqual(['accessKey.weakCnf']);
    }
  });

  it('cNF fraco numa NFC-e também é recusado', () => {
    expect(codes(validateAccessKey(CPF_WEAK_CNF, { now: NOW }))).toEqual(['accessKey.weakCnf']);
  });

  it('cNF igual ao nNF é recusado, comparando o valor numérico', () => {
    // nNF 000000123 (9 posições) e cNF 00000123 (8 posições).
    const r = validateAccessKey(patch(NUMERIC, 36, '00000123'), { now: NOW });
    expect(codes(r)).toEqual(['accessKey.cnfEqualsNumber']);
  });

  it('modelo fora de 55/65 é aviso e não aplica a regra do cNF', () => {
    const key = patch(patch(NUMERIC, 21, '57'), 36, '12345678');
    const r = validateAccessKey(key, { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.parts?.modelName).toBeNull();
    expect(codes(r, 'warnings')).toEqual(['accessKey.otherModel']);
  });

  it('junta todos os erros em vez de parar no primeiro', () => {
    let key = patch(NUMERIC, 1, '99');
    key = patch(key, 5, '13');
    key = patch(key, 35, '0');
    key = `${key.slice(0, 43)}${key[43] === '0' ? '1' : '0'}`;
    const r = validateAccessKey(key, { now: NOW });
    expect(r.errors.map((e) => e.field)).toEqual(['cUF', 'AAMM', 'tpEmis', 'cDV']);
  });

  it('as mensagens têm texto nos dois idiomas', () => {
    const r = validateAccessKey(`${NUMERIC.slice(0, 43)}5`, { now: NOW });
    expect(formatMessage(r.errors[0]!.message)).toBe(
      'O dígito verificador não confere. Esperado 4, informado 5.',
    );
    expect(formatMessage(r.errors[0]!.message, 'en')).toBe(
      'The check digit does not match. Expected 4, got 5.',
    );
  });
});

describe('buildAccessKey e generateAccessKey', () => {
  it('buildAccessKey monta a chave de referência', () => {
    expect(
      buildAccessKey({
        cUF: '35',
        aamm: '2611',
        emitter: '11222333000181',
        mod: '55',
        serie: '001',
        nNF: '000000123',
        tpEmis: '1',
        cNF: '48271934',
      }),
    ).toBe(NUMERIC);
  });

  it('gera chaves fictícias sempre válidas e sem aviso', () => {
    for (let i = 0; i < 300; i++) {
      const key = generateAccessKey({ now: NOW });
      const r = validateAccessKey(key, { now: NOW });
      expect(r.errors, key).toEqual([]);
      expect(r.warnings, key).toEqual([]);
      expect(r.parts?.aamm).toBe('2611');
      expect(r.parts?.mod).toBe('55');
      expect(r.parts?.tpEmis).toBe('1');
    }
  });

  it('gera NFC-e e aceita emitente informado', () => {
    const emitter = generateCnpj({ alphanumeric: true });
    const r = validateAccessKey(generateAccessKey({ now: NOW, mod: '65', emitter }), { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.parts?.modelName).toBe('NFC-e');
    expect(r.parts?.emitter).toBe(emitter);
  });
});
