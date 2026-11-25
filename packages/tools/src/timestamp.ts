export type TimestampUnit = 'seconds' | 'milliseconds';

/**
 * Detecta a unidade pelo tamanho. 10 dígitos ou menos = segundos (até 2286),
 * 13 dígitos = milissegundos. Pode ser forçado pelo usuário.
 */
export function detectUnit(value: string): TimestampUnit {
  const digits = value.replace(/^-/, '').split('.')[0]!.length;
  return digits >= 12 ? 'milliseconds' : 'seconds';
}

export interface TimestampInfo {
  date: Date;
  seconds: number;
  milliseconds: number;
  iso: string;
  utc: string;
  unit: TimestampUnit;
}

/** Limite do objeto Date: ±8.64e15 ms. */
const MAX_MS = 8.64e15;

export function fromTimestamp(value: string, unit?: TimestampUnit): TimestampInfo {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) throw new Error('Informe apenas números.');
  const u = unit ?? detectUnit(trimmed);
  const ms = u === 'seconds' ? Number(trimmed) * 1000 : Number(trimmed);
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS)
    throw new Error('Data fora do intervalo suportado.');
  return describe(new Date(Math.trunc(ms)), u);
}

/** Converte texto de data. Sem fuso explícito, o JavaScript interpreta ISO com hora como horário local. */
export function fromDateString(value: string): TimestampInfo {
  const trimmed = value.trim();
  checkCalendar(trimmed);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime()))
    throw new Error('Data inválida. Use, por exemplo, 2026-11-25T14:30:00Z.');
  return describe(d, 'seconds');
}

/**
 * O `Date` do JavaScript "conserta" datas impossíveis: 2026-02-30 vira 2 de
 * março sem avisar. Aqui os campos de data e hora no formato ISO são
 * conferidos antes, para que data impossível seja erro.
 */
function checkCalendar(text: string): void {
  const m = /^([+-]?\d{4,6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (!m) return;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (daysInMonth === undefined || day < 1 || day > daysInMonth) {
    throw new Error(`Data inexistente: ${m[1]}-${m[2]}-${m[3]}.`);
  }
  if (m[4] !== undefined && (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6] ?? 0) > 59)) {
    throw new Error('Horário inválido. Horas vão de 00 a 23 e minutos e segundos de 00 a 59.');
  }
}

function describe(date: Date, unit: TimestampUnit): TimestampInfo {
  const ms = date.getTime();
  return {
    date,
    milliseconds: ms,
    seconds: Math.floor(ms / 1000),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    unit,
  };
}

export function formatInZone(date: Date, timeZone: string, locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date);
}

/** "há 3 dias", "em 2 horas". */
export function relativeTime(date: Date, now: Date = new Date(), locale = 'pt-BR'): string {
  const diff = (date.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === 'second') {
      return rtf.format(Math.round(diff / secs), unit);
    }
  }
  return rtf.format(0, 'second');
}
