/**
 * Validação da chave de acesso de 44 posições da NF-e (modelo 55) e da NFC-e
 * (modelo 65).
 *
 * Validar a chave NÃO comprova que a nota existe nem que foi autorizada pela
 * SEFAZ. Só mostra que a sequência segue a lei de formação.
 *
 * Fontes, com versão:
 * - NT Conjunta 2025.001 v1.00 (25/04/2025), CNPJ alfanumérico nos DF-e. Item
 *   5: estrutura da chave, regex `[0-9]{6}[A-Z0-9]{12}[0-9]{26}` e DV por
 *   módulo 11 sobre o valor ASCII de cada caractere menos 48. Anexo II:
 *   pesos de 2 a 9 a partir da direita, DV = 11 − (soma mod 11), e 0 quando o
 *   resultado for 10 ou 11. Implantação em produção: 06/07/2026.
 * - NT 2019.001 v1.00 (abril de 2019), regra B03-10 (Rejeição 897, modelos
 *   55 e 65): lista de cNF proibidos e cNF diferente de nNF.
 * - MOC, campo B22 (tpEmis): 1 normal, 2 FS-IA, 3 SCAN (desativado), 4 EPEC,
 *   5 FS-DA, 6 SVC-AN, 7 SVC-RS, 9 contingência off-line da NFC-e.
 * - Código da UF: tabela do IBGE usada no campo cUF.
 *
 * Para chaves só com números, o cálculo ASCII − 48 dá o mesmo resultado do
 * módulo 11 tradicional, então chaves antigas continuam válidas.
 */
import { generateCnpj, validateCnpj, validateCpf } from './brazil';
import { msg, type ToolMessage } from './messages';
import { randomInt } from './password';

export type AccessKeyField =
  'cUF' | 'AAMM' | 'emitter' | 'mod' | 'serie' | 'nNF' | 'tpEmis' | 'cNF' | 'cDV';

export interface AccessKeyIssue {
  /** Campo da chave a que o problema se refere. `null` quando é da chave inteira. */
  field: AccessKeyField | null;
  message: ToolMessage;
}

export interface AccessKeyParts {
  cUF: string;
  /** Sigla da UF, quando o código existe na tabela do IBGE. */
  uf: string | null;
  /** AAMM como aparece na chave. */
  aamm: string;
  year: number;
  month: number;
  emitter: string;
  /** `null` quando as posições não formam CNPJ nem CPF válido. */
  emitterType: 'cnpj' | 'cpf' | null;
  /** CNPJ ou CPF formatado, quando válido. */
  emitterFormatted: string | null;
  alphanumeric: boolean;
  mod: string;
  modelName: 'NF-e' | 'NFC-e' | null;
  serie: string;
  nNF: string;
  tpEmis: string;
  cNF: string;
  cDV: string;
}

export interface AccessKeyResult {
  /** Válida quando não há nenhum erro. Avisos não invalidam a chave. */
  valid: boolean;
  /** Chave sem espaços, pontos ou traços e em maiúsculas. */
  normalized: string;
  /** Chave em grupos de 4, como no DANFE. */
  formatted: string;
  /** Campos separados. Ausente quando a chave nem tem a forma certa. */
  parts: AccessKeyParts | null;
  /** DV calculado a partir das 43 primeiras posições, quando dá para calcular. */
  expectedDv: string | null;
  errors: AccessKeyIssue[];
  warnings: AccessKeyIssue[];
}

/** Posição (1 a 44) e tamanho de cada campo, na ordem da chave. */
export const ACCESS_KEY_LAYOUT: readonly { field: AccessKeyField; start: number; size: number }[] =
  [
    { field: 'cUF', start: 1, size: 2 },
    { field: 'AAMM', start: 3, size: 4 },
    { field: 'emitter', start: 7, size: 14 },
    { field: 'mod', start: 21, size: 2 },
    { field: 'serie', start: 23, size: 3 },
    { field: 'nNF', start: 26, size: 9 },
    { field: 'tpEmis', start: 35, size: 1 },
    { field: 'cNF', start: 36, size: 8 },
    { field: 'cDV', start: 44, size: 1 },
  ];

/** Códigos de UF do IBGE. */
export const UF_CODES: Readonly<Record<string, string>> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

/** tpEmis (campo B22 do MOC). O 3 (SCAN) existe no layout, mas está desativado. */
export const TP_EMIS: Readonly<Record<string, string>> = {
  '1': 'normal',
  '2': 'FS-IA',
  '3': 'SCAN',
  '4': 'EPEC',
  '5': 'FS-DA',
  '6': 'SVC-AN',
  '7': 'SVC-RS',
  '9': 'offline',
};

/** cNF proibidos pela regra B03-10 da NT 2019.001. */
export const WEAK_CNF: ReadonlySet<string> = new Set([
  '00000000',
  '11111111',
  '22222222',
  '33333333',
  '44444444',
  '55555555',
  '66666666',
  '77777777',
  '88888888',
  '99999999',
  '12345678',
  '23456789',
  '34567890',
  '45678901',
  '56789012',
  '67890123',
  '78901234',
  '89012345',
  '90123456',
  '01234567',
]);

/** Início da produção do CNPJ alfanumérico nos DF-e (NT 2025.001): julho de 2026. */
const ALPHANUMERIC_START = { year: 2026, month: 7 };

const KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

/**
 * DV da chave a partir das 43 primeiras posições. Cada caractere vale o código
 * ASCII menos 48 ("0"–"9" valem 0–9 e "A"–"Z" valem 17–42).
 */
export function accessKeyCheckDigit(first43: string): string {
  if (!/^[0-9A-Z]{43}$/.test(first43)) {
    throw new TypeError('accessKeyCheckDigit espera 43 caracteres de 0-9 ou A-Z.');
  }
  let sum = 0;
  let weight = 2;
  for (let i = first43.length - 1; i >= 0; i--) {
    sum += (first43.charCodeAt(i) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const dv = 11 - (sum % 11);
  return String(dv >= 10 ? 0 : dv);
}

/**
 * Tira espaços, pontos e traços, passa para maiúsculas e remove o prefixo
 * "NFe" do atributo Id do XML (`Id="NFe3524..."`).
 */
export function normalizeAccessKey(input: string): string {
  const c = input.toUpperCase().replace(/[\s.-]/g, '');
  return c.length === 47 && c.startsWith('NFE') ? c.slice(3) : c;
}

/** Grupos de 4 caracteres separados por espaço, como no DANFE. */
export function formatAccessKey(key: string): string {
  return (normalizeAccessKey(key).match(/.{1,4}/g) ?? []).join(' ');
}

function splitKey(key: string): Record<AccessKeyField, string> {
  const out = {} as Record<AccessKeyField, string>;
  for (const { field, start, size } of ACCESS_KEY_LAYOUT) {
    out[field] = key.slice(start - 1, start - 1 + size);
  }
  return out;
}

function identifyEmitter(emitter: string) {
  const cnpj = validateCnpj(emitter);
  // CPF ocupa as 14 posições com três zeros à esquerda.
  const cpf =
    !cnpj.alphanumeric && emitter.startsWith('000') ? validateCpf(emitter.slice(3)) : null;
  return { cnpj, cpf: cpf?.valid ? cpf : null };
}

export function validateAccessKey(input: string, opts: { now?: Date } = {}): AccessKeyResult {
  const normalized = normalizeAccessKey(input.trim());
  const formatted = formatAccessKey(normalized);
  const errors: AccessKeyIssue[] = [];
  const warnings: AccessKeyIssue[] = [];
  const fail = (message: ToolMessage): AccessKeyResult => ({
    valid: false,
    normalized,
    formatted,
    parts: null,
    expectedDv: null,
    errors: [{ field: null, message }],
    warnings,
  });

  if (!/^[0-9A-Z]*$/.test(normalized)) return fail(msg('accessKey.badChars'));
  if (normalized.length !== 44) {
    return fail(msg('accessKey.badLength', { count: normalized.length }));
  }
  if (!KEY_PATTERN.test(normalized)) return fail(msg('accessKey.lettersOutsideCnpj'));

  const f = splitKey(normalized);
  const err = (field: AccessKeyField, m: ToolMessage) => errors.push({ field, message: m });
  const warn = (field: AccessKeyField, m: ToolMessage) => warnings.push({ field, message: m });

  // cUF
  const uf = UF_CODES[f.cUF] ?? null;
  if (!uf) err('cUF', msg('accessKey.badUf', { code: f.cUF }));

  // AAMM
  const year = 2000 + Number(f.AAMM.slice(0, 2));
  const month = Number(f.AAMM.slice(2));
  if (month < 1 || month > 12) {
    err('AAMM', msg('accessKey.badMonth', { month: f.AAMM.slice(2) }));
  } else {
    const now = opts.now ?? new Date();
    const nowIndex = now.getFullYear() * 12 + now.getMonth();
    if (year * 12 + (month - 1) > nowIndex) {
      warn('AAMM', msg('accessKey.futureDate', { aamm: `${f.AAMM.slice(2)}/${year}` }));
    }
  }

  // CNPJ ou CPF do emitente
  const alphanumeric = /[A-Z]/.test(f.emitter);
  const { cnpj, cpf } = identifyEmitter(f.emitter);
  let emitterType: AccessKeyParts['emitterType'] = null;
  let emitterFormatted: string | null = null;
  if (cnpj.valid) {
    emitterType = 'cnpj';
    emitterFormatted = cnpj.formatted;
    if (cpf) warn('emitter', msg('accessKey.emitterAmbiguous'));
  } else if (cpf) {
    emitterType = 'cpf';
    emitterFormatted = cpf.formatted;
  } else {
    err(
      'emitter',
      alphanumeric
        ? msg('accessKey.cnpjInvalid', { value: f.emitter })
        : msg('accessKey.emitterInvalid', { value: f.emitter }),
    );
  }
  if (
    alphanumeric &&
    month >= 1 &&
    month <= 12 &&
    year * 12 + month < ALPHANUMERIC_START.year * 12 + ALPHANUMERIC_START.month
  ) {
    warn('emitter', msg('accessKey.alphanumericBeforeStart'));
  }

  // Modelo. As regras específicas de NF-e e NFC-e só valem para 55 e 65.
  const modelName = f.mod === '55' ? 'NF-e' : f.mod === '65' ? 'NFC-e' : null;
  if (!modelName) warn('mod', msg('accessKey.otherModel', { mod: f.mod }));

  // Número
  if (/^0+$/.test(f.nNF)) err('nNF', msg('accessKey.zeroNumber'));

  // Forma de emissão
  if (!(f.tpEmis in TP_EMIS)) {
    err('tpEmis', msg('accessKey.badTpEmis', { value: f.tpEmis }));
  } else if (f.tpEmis === '3') {
    warn('tpEmis', msg('accessKey.scanDisabled'));
  } else if (f.tpEmis === '9' && f.mod === '55') {
    warn('tpEmis', msg('accessKey.offlineOnlyNfce'));
  }

  // Código numérico (regra B03-10)
  if (modelName) {
    if (WEAK_CNF.has(f.cNF)) err('cNF', msg('accessKey.weakCnf', { value: f.cNF }));
    // nNF tem 9 posições e cNF tem 8. A regra compara os valores numéricos.
    else if (Number(f.cNF) === Number(f.nNF)) err('cNF', msg('accessKey.cnfEqualsNumber'));
  }

  // Dígito verificador
  const expectedDv = accessKeyCheckDigit(normalized.slice(0, 43));
  if (expectedDv !== f.cDV) {
    err('cDV', msg('accessKey.badDv', { expected: expectedDv, found: f.cDV }));
  }

  return {
    valid: errors.length === 0,
    normalized,
    formatted,
    expectedDv,
    errors,
    warnings,
    parts: {
      cUF: f.cUF,
      uf,
      aamm: f.AAMM,
      year,
      month,
      emitter: f.emitter,
      emitterType,
      emitterFormatted,
      alphanumeric,
      mod: f.mod,
      modelName,
      serie: f.serie,
      nNF: f.nNF,
      tpEmis: f.tpEmis,
      cNF: f.cNF,
      cDV: f.cDV,
    },
  };
}

export interface AccessKeyDraft {
  cUF: string;
  aamm: string;
  emitter: string;
  mod: string;
  serie: string;
  nNF: string;
  tpEmis: string;
  cNF: string;
}

/** Monta a chave a partir dos campos (já com o tamanho certo) e calcula o DV. */
export function buildAccessKey(d: AccessKeyDraft): string {
  const first43 = d.cUF + d.aamm + d.emitter + d.mod + d.serie + d.nNF + d.tpEmis + d.cNF;
  return first43 + accessKeyCheckDigit(first43);
}

const randomDigits = (n: number) => Array.from({ length: n }, () => randomInt(10)).join('');

/**
 * Gera uma chave fictícia de NF-e para TESTES: CNPJ fictício, emissão normal,
 * mês atual e cNF fora da lista proibida.
 */
export function generateAccessKey(
  opts: { now?: Date; mod?: '55' | '65'; emitter?: string } = {},
): string {
  const now = opts.now ?? new Date();
  const ufCodes = Object.keys(UF_CODES);
  const nNF = String(1 + randomInt(999_999_999)).padStart(9, '0');
  let cNF = randomDigits(8);
  while (WEAK_CNF.has(cNF) || Number(cNF) === Number(nNF)) cNF = randomDigits(8);
  return buildAccessKey({
    cUF: ufCodes[randomInt(ufCodes.length)]!,
    aamm:
      String(now.getFullYear() % 100).padStart(2, '0') +
      String(now.getMonth() + 1).padStart(2, '0'),
    emitter: opts.emitter ?? generateCnpj(),
    mod: opts.mod ?? '55',
    serie: String(1 + randomInt(99)).padStart(3, '0'),
    nNF,
    tpEmis: '1',
    cNF,
  });
}
