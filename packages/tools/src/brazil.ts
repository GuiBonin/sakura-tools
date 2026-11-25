/**
 * Validação de CPF e CNPJ por dígito verificador.
 *
 * Validar o dígito NÃO comprova que o documento existe nem a situação
 * cadastral. Só mostra que a sequência é matematicamente coerente.
 *
 * CNPJ alfanumérico: a IN RFB nº 2.229/2024 criou o CNPJ com letras nas
 * 12 primeiras posições (raiz + ordem). Os 2 dígitos verificadores continuam
 * numéricos. O cálculo usa o valor ASCII do caractere menos 48, então
 * "0"–"9" valem 0–9 e "A"–"Z" valem 17–42. Os CNPJs numéricos existentes
 * continuam válidos com o mesmo algoritmo.
 */
import { msg, type ToolMessage } from './messages';
import { randomInt } from './password';

export type DocumentValidation =
  { valid: true; formatted: string; normalized: string } | { valid: false; reason: ToolMessage };

const onlyDigits = (s: string) => s.replace(/\D/g, '');

// ---------------------------------------------------------------- CPF

function cpfCheckDigits(base9: string): string {
  const calc = (digits: string, startWeight: number) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += Number(digits[i]) * (startWeight - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(base9, 10);
  const d2 = calc(base9 + d1, 11);
  return `${d1}${d2}`;
}

export function formatCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function validateCpf(input: string): DocumentValidation {
  const trimmed = input.trim();
  if (!/^[\d.\-\s]+$/.test(trimmed)) return { valid: false, reason: msg('cpf.badChars') };
  const d = onlyDigits(trimmed);
  if (d.length !== 11) return { valid: false, reason: msg('cpf.badLength', { count: d.length }) };
  if (/^(\d)\1{10}$/.test(d))
    return {
      valid: false,
      reason: msg('cpf.repeated'),
    };
  if (cpfCheckDigits(d.slice(0, 9)) !== d.slice(9)) {
    return { valid: false, reason: msg('doc.checkDigits') };
  }
  return { valid: true, normalized: d, formatted: formatCpf(d) };
}

/** Gera um CPF fictício, matematicamente válido, para TESTES. */
export function generateCpf(): string {
  let base = '';
  do {
    base = Array.from({ length: 9 }, () => randomInt(10)).join('');
  } while (/^(\d)\1{8}$/.test(base));
  return base + cpfCheckDigits(base);
}

// ---------------------------------------------------------------- CNPJ

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const charValue = (c: string) => c.charCodeAt(0) - 48;

function cnpjCheckDigits(base12: string): string {
  const calc = (chars: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < chars.length; i++) sum += charValue(chars[i]!) * weights[i]!;
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = calc(base12, CNPJ_WEIGHTS_1);
  const d2 = calc(base12 + d1, CNPJ_WEIGHTS_2);
  return `${d1}${d2}`;
}

/** Remove pontuação e coloca em maiúsculas. Letras só são aceitas nas 12 primeiras posições. */
export function normalizeCnpj(input: string): string {
  return input.toUpperCase().replace(/[.\-/\s]/g, '');
}

export function formatCnpj(cnpj: string): string {
  const c = normalizeCnpj(cnpj);
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export function validateCnpj(input: string): DocumentValidation & { alphanumeric?: boolean } {
  const c = normalizeCnpj(input.trim());
  if (!/^[0-9A-Z]*$/.test(c)) return { valid: false, reason: msg('cnpj.badChars') };
  if (c.length !== 14) return { valid: false, reason: msg('cnpj.badLength', { count: c.length }) };
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c)) {
    return {
      valid: false,
      reason: msg('cnpj.checkNotDigits'),
    };
  }
  // Raiz + ordem com um caractere só (00000000000000, AAAAAAAAAAAA45) passa no
  // cálculo mas não é um CNPJ real.
  if (/^(.)\1{11}/.test(c)) return { valid: false, reason: msg('cnpj.repeated') };
  if (cnpjCheckDigits(c.slice(0, 12)) !== c.slice(12)) {
    return { valid: false, reason: msg('doc.checkDigits') };
  }
  return { valid: true, normalized: c, formatted: formatCnpj(c), alphanumeric: /[A-Z]/.test(c) };
}

/** Gera um CNPJ fictício para TESTES. Matriz (ordem 0001) por padrão. */
export function generateCnpj(opts: { alphanumeric?: boolean } = {}): string {
  const alphabet = opts.alphanumeric ? CNPJ_ALNUM : '0123456789';
  let root = '';
  do {
    root = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
  } while (/^(.)\1{7}$/.test(root));
  const base = root + '0001';
  return base + cnpjCheckDigits(base);
}
