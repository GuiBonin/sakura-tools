/** Hashes com Web Crypto. Nenhum dado sai do navegador. */

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGORITHMS: readonly HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashBytes(
  data: Uint8Array,
  algorithm: HashAlgorithm = 'SHA-256',
): Promise<string> {
  return toHex(await crypto.subtle.digest(algorithm, data as BufferSource));
}

export async function hashText(
  text: string,
  algorithm: HashAlgorithm = 'SHA-256',
): Promise<string> {
  return hashBytes(new TextEncoder().encode(text), algorithm);
}

export async function hmac(
  text: string,
  key: string,
  algorithm: Exclude<HashAlgorithm, 'SHA-1'> = 'SHA-256',
): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(text)));
}

/** Compara dois hashes sem diferenciar caixa e ignorando espaços. */
export function hashesMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}
