/** UUIDs com gerador criptográfico (crypto.getRandomValues). Nunca Math.random. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toUuidString(bytes: Uint8Array): string {
  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return toUuidString(bytes);
}

/** UUID v7 (RFC 9562): 48 bits de timestamp em ms + aleatório. Ordenável por tempo. */
export function uuidV7(now: number = Date.now()): string {
  // O campo tem 48 bits. Fora disso o valor seria truncado em silêncio.
  if (!Number.isInteger(now) || now < 0 || now >= 2 ** 48) {
    throw new RangeError('Timestamp fora do intervalo do UUID v7 (inteiro entre 0 e 2^48 − 1 ms).');
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let ts = BigInt(now);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return toUuidString(bytes);
}

export interface UuidInfo {
  valid: boolean;
  version?: number;
  variant?: 'RFC 9562' | 'NCS' | 'Microsoft' | 'futuro';
  /** Só para v7: momento embutido no UUID. */
  timestamp?: Date;
  nil?: boolean;
}

export function inspectUuid(value: string): UuidInfo {
  const v = value.trim();
  if (!UUID_RE.test(v)) return { valid: false };
  const clean = v.replace(/-/g, '').toLowerCase();
  if (/^0+$/.test(clean)) return { valid: true, nil: true, version: 0 };
  const version = parseInt(clean[12]!, 16);
  const variantNibble = parseInt(clean[16]!, 16);
  const variant =
    variantNibble < 8
      ? 'NCS'
      : variantNibble < 12
        ? 'RFC 9562'
        : variantNibble < 14
          ? 'Microsoft'
          : 'futuro';
  const info: UuidInfo = { valid: true, version, variant };
  if (version === 7) info.timestamp = new Date(parseInt(clean.slice(0, 12), 16));
  return info;
}

export function generateUuids(count: number, version: 4 | 7 = 4): string[] {
  const n = Math.min(Math.max(1, Math.floor(count)), 1000);
  return Array.from({ length: n }, () => (version === 4 ? uuidV4() : uuidV7()));
}
