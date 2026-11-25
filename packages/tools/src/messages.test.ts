import { describe, expect, it } from 'vitest';
import { decodeBase64 } from './base64';
import { validateCpf } from './brazil';
import { decodeJwt } from './jwt';
import {
  MESSAGE_CATALOG,
  errorText,
  formatMessage,
  isToolMessage,
  msg,
  ToolError,
  type MessageCode,
} from './messages';
import { runRegex } from './regex';
import { validateXml, XmlError } from './xml';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Catálogo de mensagens', () => {
  const codes = Object.keys(MESSAGE_CATALOG) as MessageCode[];

  it.each(codes)('%s tem pt-BR e en, com os mesmos parâmetros', (code) => {
    const { 'pt-BR': pt, en } = MESSAGE_CATALOG[code];
    expect(pt.trim()).not.toBe('');
    expect(en.trim()).not.toBe('');
    expect(en).not.toBe(pt);
    expect(placeholders(en)).toEqual(placeholders(pt));
  });
});

describe('formatMessage', () => {
  it('troca os parâmetros no idioma pedido', () => {
    const m = msg('cpf.badLength', { count: 9 });
    expect(formatMessage(m)).toBe('O CPF tem 11 dígitos. Foram informados 9.');
    expect(formatMessage(m, 'en')).toBe('A CPF has 11 digits. 9 were given.');
  });

  it('texto pronto (erro do motor JavaScript) passa sem mudança', () => {
    expect(formatMessage('Invalid regular expression', 'pt-BR')).toBe('Invalid regular expression');
  });

  it('parâmetro ausente fica visível em vez de virar "undefined"', () => {
    expect(formatMessage({ code: 'xml.badTagName' }, 'en')).toBe('Invalid tag name: "{name}".');
  });
});

describe('ToolError e errorText', () => {
  it('ToolError guarda o código e usa pt-BR em message', () => {
    const e = new ToolError('qr.tooLarge', { max: 2953 });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Conteúdo grande demais para um QR Code (máximo 2953 bytes).');
    expect(errorText(e, 'en')).toBe('Content too large for a QR Code (maximum 2953 bytes).');
  });

  it('XmlError é ToolError com linha e coluna', () => {
    const e = new XmlError(msg('xml.noElement'), 2, 5);
    expect(e).toBeInstanceOf(ToolError);
    expect([e.line, e.column]).toEqual([2, 5]);
    expect(errorText(e, 'en')).toBe('No element found.');
  });

  it('mensagem que atravessou o Web Worker (objeto simples) também é traduzida', () => {
    const viaWorker: unknown = JSON.parse(JSON.stringify(msg('regex.timeout', { ms: 1500 })));
    expect(isToolMessage(viaWorker)).toBe(true);
    expect(errorText(viaWorker, 'en')).toMatch(/longer than 1500 ms/);
  });

  it('erro comum e valores soltos não quebram', () => {
    expect(errorText(new Error('boom'), 'en')).toBe('boom');
    expect(errorText('texto', 'en')).toBe('texto');
    expect(errorText({ code: 'nao.existe' }, 'en')).toBe('[object Object]');
  });
});

describe('Os pacotes devolvem mensagens traduzíveis', () => {
  it('Base64 inválido', () => {
    let caught: unknown;
    try {
      decodeBase64('***');
    } catch (e) {
      caught = e;
    }
    expect(errorText(caught, 'en')).toBe('Text contains characters that are not part of Base64.');
  });

  it('CPF, XML, regex e JWT', () => {
    const cpf = validateCpf('123');
    expect(!cpf.valid && formatMessage(cpf.reason, 'en')).toBe(
      'A CPF has 11 digits. 3 were given.',
    );
    const xml = validateXml('<!DOCTYPE x><x/>');
    expect(xml.error && formatMessage(xml.error.message, 'en')).toMatch(/^DOCTYPE and entity/);
    const re = runRegex('a', 'gg', 'a');
    expect(!re.ok && formatMessage(re.error, 'en')).toBe('Invalid flags: "gg".');
    const jwt = decodeJwt('eyJhbGciOiJub25lIn0.e30.');
    expect(jwt.warnings.map((w) => formatMessage(w, 'en'))).toContain(
      'alg "none" means an unsigned token. Never accept it in production.',
    );
  });
});
