import { ToolError } from './messages';
import QRCode from 'qrcode';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
  errorCorrectionLevel: QrErrorLevel;
  margin: number;
  dark: string;
  light: string;
}

export const QR_DEFAULTS: QrOptions = {
  errorCorrectionLevel: 'M',
  margin: 2,
  dark: '#151218',
  light: '#ffffff',
};

/** Capacidade máxima em bytes no nível L, versão 40. */
export const QR_MAX_BYTES = 2953;

/** Gera o QR Code como SVG. Tudo local, nenhum serviço externo. */
export async function generateQrSvg(text: string, opts: Partial<QrOptions> = {}): Promise<string> {
  if (text === '') throw new ToolError('qr.empty');
  if (new TextEncoder().encode(text).length > QR_MAX_BYTES) {
    throw new ToolError('qr.tooLarge', { max: QR_MAX_BYTES });
  }
  const o = { ...QR_DEFAULTS, ...opts };
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: o.errorCorrectionLevel,
    margin: o.margin,
    color: { dark: o.dark, light: o.light },
  });
}

/** Monta o texto padrão de rede Wi-Fi reconhecido pelas câmeras de celular. */
export function wifiPayload(
  ssid: string,
  password: string,
  security: 'WPA' | 'WEP' | 'nopass',
  hidden = false,
): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:${security};S:${esc(ssid)};${security === 'nopass' ? '' : `P:${esc(password)};`}${hidden ? 'H:true;' : ''};`;
}
