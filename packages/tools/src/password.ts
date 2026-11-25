/** Gerador de senhas com crypto.getRandomValues e amostragem por rejeição (sem viés de módulo). */

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Remove caracteres parecidos: 0 O o 1 l I | */
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
} as const;

const AMBIGUOUS = new Set('0Oo1lI|'.split(''));

export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 256;

/** Inteiro uniforme em [0, max) sem viés. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max inválido');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

function activeSets(opts: PasswordOptions): string[] {
  return (Object.keys(SETS) as Array<keyof typeof SETS>)
    .filter((k) => opts[k])
    .map((k) => {
      const chars = SETS[k].split('');
      return (opts.excludeAmbiguous ? chars.filter((c) => !AMBIGUOUS.has(c)) : chars).join('');
    });
}

export function generatePassword(opts: PasswordOptions = DEFAULT_PASSWORD_OPTIONS): string {
  const sets = activeSets(opts);
  if (sets.length === 0) throw new Error('Selecione pelo menos um tipo de caractere.');
  const length = Math.floor(opts.length);
  if (length < Math.max(PASSWORD_MIN_LENGTH, sets.length) || length > PASSWORD_MAX_LENGTH) {
    throw new RangeError(
      `O tamanho deve ficar entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH}.`,
    );
  }
  const all = sets.join('');
  // Amostragem por rejeição: sorteia a senha inteira do alfabeto completo e
  // descarta se faltar algum conjunto. Assim toda senha válida tem a mesma
  // chance e a entropia exibida (passwordEntropy) é exata, não um teto.
  // No pior caso permitido (4 caracteres, 4 conjuntos) aceita ~1 em 14.
  for (let attempt = 0; attempt < 100_000; attempt++) {
    let candidate = '';
    for (let i = 0; i < length; i++) candidate += all[randomInt(all.length)]!;
    if (sets.every((s) => [...candidate].some((c) => s.includes(c)))) return candidate;
  }
  throw new Error('Não foi possível gerar a senha. Aumente o tamanho.');
}

/**
 * Entropia em bits das senhas que o gerador produz: log2 da quantidade de
 * senhas do tamanho pedido que têm pelo menos um caractere de cada conjunto
 * escolhido (inclusão-exclusão). Como o sorteio é uniforme entre elas, é exata.
 */
export function passwordEntropy(opts: PasswordOptions): number {
  const sizes = activeSets(opts).map((s) => BigInt(s.length));
  const length = Math.floor(opts.length);
  if (sizes.length === 0 || length < sizes.length) return 0;
  const total = sizes.reduce((a, b) => a + b, 0n);
  let count = 0n;
  for (let mask = 0; mask < 1 << sizes.length; mask++) {
    let excluded = 0n;
    let bits = 0;
    sizes.forEach((size, i) => {
      if (mask & (1 << i)) {
        excluded += size;
        bits++;
      }
    });
    const term = (total - excluded) ** BigInt(length);
    count += bits % 2 === 0 ? term : -term;
  }
  return Math.round(log2BigInt(count) * 10) / 10;
}

function log2BigInt(n: bigint): number {
  if (n <= 0n) return 0;
  const bitLength = n.toString(2).length;
  const shift = Math.max(0, bitLength - 53);
  return Math.log2(Number(n >> BigInt(shift))) + shift;
}

export type StrengthLabel = 'muito fraca' | 'fraca' | 'razoável' | 'forte' | 'muito forte';

export function strengthFromEntropy(bits: number): StrengthLabel {
  if (bits < 40) return 'muito fraca';
  if (bits < 60) return 'fraca';
  if (bits < 80) return 'razoável';
  if (bits < 110) return 'forte';
  return 'muito forte';
}
