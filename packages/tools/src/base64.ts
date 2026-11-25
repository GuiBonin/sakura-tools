import { ToolError } from './messages';
/** Base64 com suporte a UTF-8 (btoa sozinho quebra com acentos e emoji). */

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function base64ToBytes(input: string): Uint8Array {
  let clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new ToolError('base64.invalidChars');
  }
  clean = clean.replace(/=+$/, '');
  if (clean.length % 4 === 1) {
    throw new ToolError('base64.invalidLength');
  }
  clean += '='.repeat((4 - (clean.length % 4)) % 4);
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeBase64(text: string, urlSafe = false): string {
  return bytesToBase64(new TextEncoder().encode(text), urlSafe);
}

/**
 * Decodifica para texto UTF-8. Se os bytes não forem UTF-8 válido
 * (ex.: um PNG em Base64), lança erro em vez de mostrar lixo.
 */
export function decodeBase64(input: string): string {
  const bytes = base64ToBytes(input);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ToolError('base64.notUtf8');
  }
}
