import { accessKeyCheckDigit } from '@sakura-tools/tools/accessKey';
import { describe, expect, it } from 'vitest';
import { CODE_TABLES, describeCode } from './codes';
import { fieldLabel } from './labels';
import { NFE_NAMESPACE, parseFiscalXml, type FiscalDocument, type FiscalParseResult } from './nfe';
import { buildSampleNfe, type SampleOptions } from './sample';

// Tudo aqui é fictício: CNPJ e CPF de exemplo, ambiente de homologação.
const EMIT = '11222333000181';
const DEST = '52998224725';
const DATE = new Date(Date.UTC(2026, 10, 26, 15, 0, 0)); // 26/11/2026 12:00 em Brasília
const DECL = '<?xml version="1.0" encoding="UTF-8"?>\n';

const sample = (o: SampleOptions = {}) =>
  buildSampleNfe({ emitCnpj: EMIT, destCpf: DEST, date: DATE, ...o });

function ok(r: FiscalParseResult): FiscalDocument {
  if (!r.ok) throw new Error(`esperava sucesso: ${r.error.message.code}`);
  return r;
}
const codes = (issues: { message: { code: string } }[]) => issues.map((i) => i.message.code);

describe('buildSampleNfe', () => {
  it('gera chave coerente com os campos', () => {
    const { key } = sample();
    expect(key).toHaveLength(44);
    expect(key.slice(0, 6)).toBe('352611');
    expect(key.slice(6, 20)).toBe(EMIT);
    expect(key.slice(-1)).toBe(accessKeyCheckDigit(key.slice(0, 43)));
  });

  it('sem opções gera nota válida com dados aleatórios', () => {
    const doc = ok(parseFiscalXml(buildSampleNfe().xml));
    expect(doc.nfes[0]?.key?.valid).toBe(true);
    expect(doc.nfes[0]?.issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});

describe('parseFiscalXml: NFe e nfeProc', () => {
  it('NFe sem protocolo: resumo, itens e avisos', () => {
    const { xml, key } = sample();
    const doc = ok(parseFiscalXml(xml));
    expect(doc.root).toBe('NFe');
    expect(doc.issues).toEqual([]);
    expect(doc.nfes).toHaveLength(1);
    const nfe = doc.nfes[0]!;
    expect(nfe.id).toBe(`NFe${key}`);
    expect(nfe.version).toBe('4.00');
    expect(nfe.key?.valid).toBe(true);
    expect(nfe.summary).toEqual({
      mod: '55',
      serie: '1',
      nNF: '1234',
      dhEmi: '2026-11-26T12:00:00-03:00',
      natOp: 'VENDA DE MERCADORIA',
      tpAmb: '2',
      tpNF: '1',
      finNFe: '1',
      tpEmis: '1',
      vNF: '150.00',
      emitName: 'EMPRESA FICTICIA DE TESTE LTDA',
      emitDoc: EMIT,
      destName: 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
      destDoc: DEST,
    });
    expect(nfe.items.map((i) => [i.nItem, i.xProd, i.vProd, i.CFOP])).toEqual([
      ['1', 'CAFE TORRADO 500G (EXEMPLO)', '50.00', '5102'],
      ['2', 'CAFE EM GRAOS 1KG (EXEMPLO)', '100.00', '5102'],
    ]);
    expect(nfe.items[0]?.imposto?.children.map((c) => c.local)).toEqual([
      'ICMS',
      'PIS',
      'COFINS',
      'IBSCBS',
    ]);
    expect(nfe.protocol).toBeNull();
    expect(codes(nfe.issues)).toEqual(['nfe.homologation', 'nfe.noProtocol']);
  });

  it('nfeProc lê o protocolo e confere a chave dele', () => {
    const { xml, key } = sample({ withProtocol: true });
    const doc = ok(parseFiscalXml(xml));
    expect(doc.root).toBe('nfeProc');
    expect(doc.version).toBe('4.00');
    const nfe = doc.nfes[0]!;
    expect(nfe.protocol).toMatchObject({
      chNFe: key,
      cStat: '100',
      xMotivo: 'Autorizado o uso da NF-e',
      nProt: '135000000000001',
      tpAmb: '2',
    });
    expect(codes(nfe.issues)).toEqual(['nfe.homologation']);
  });

  it('protocolo com chave de outra nota é erro', () => {
    const { xml, key } = sample({ withProtocol: true });
    const other = key.slice(0, 30) + (key[30] === '9' ? '8' : '9') + key.slice(31);
    const doc = ok(parseFiscalXml(xml.replace(`<chNFe>${key}</chNFe>`, `<chNFe>${other}</chNFe>`)));
    expect(codes(doc.nfes[0]!.issues)).toContain('nfe.protocolKeyMismatch');
  });

  it('NFC-e (modelo 65)', () => {
    const doc = ok(parseFiscalXml(sample({ mod: '65' }).xml));
    expect(doc.nfes[0]?.summary.mod).toBe('65');
    expect(doc.nfes[0]?.key?.parts?.modelName).toBe('NFC-e');
    expect(doc.nfes[0]?.key?.valid).toBe(true);
  });

  it('emitente com CPF bate com o trecho do emitente na chave', () => {
    const { xml, key } = sample();
    const base = key.slice(0, 6) + '000' + DEST + key.slice(20, 43);
    const cpfKey = base + accessKeyCheckDigit(base);
    const changed = xml
      .replace(`NFe${key}`, `NFe${cpfKey}`)
      .replace(`<CNPJ>${EMIT}</CNPJ>`, `<CPF>${DEST}</CPF>`)
      .replace(`<cDV>${key.slice(-1)}</cDV>`, `<cDV>${cpfKey.slice(-1)}</cDV>`);
    const nfe = ok(parseFiscalXml(changed)).nfes[0]!;
    expect(nfe.key?.parts?.emitterType).toBe('cpf');
    expect(codes(nfe.issues)).toEqual(['nfe.homologation', 'nfe.noProtocol']);
  });
});

describe('parseFiscalXml: chave contra os campos', () => {
  it.each([
    ['nNF', '<nNF>1234</nNF>', '<nNF>1235</nNF>', { field: 'nNF', xml: '1235', key: '000001234' }],
    ['serie', '<serie>1</serie>', '<serie>2</serie>', { field: 'serie', xml: '2', key: '001' }],
    ['cUF', '<cUF>35</cUF>', '<cUF>33</cUF>', { field: 'cUF', xml: '33', key: '35' }],
    [
      'cNF',
      '<cNF>48271934</cNF>',
      '<cNF>48271935</cNF>',
      { field: 'cNF', xml: '48271935', key: '48271934' },
    ],
    ['tpEmis', '<tpEmis>1</tpEmis>', '<tpEmis>2</tpEmis>', { field: 'tpEmis', xml: '2', key: '1' }],
    ['mod', '<mod>55</mod>', '<mod>65</mod>', { field: 'mod', xml: '65', key: '55' }],
  ])('%s diferente da chave', (_, from, to, params) => {
    const { xml } = sample();
    const nfe = ok(parseFiscalXml(xml.replace(from, to))).nfes[0]!;
    const mismatch = nfe.issues.filter((i) => i.message.code === 'nfe.keyFieldMismatch');
    expect(mismatch).toEqual([
      { level: 'error', message: { code: 'nfe.keyFieldMismatch', params } },
    ]);
  });

  it('CNPJ do emitente diferente da chave', () => {
    const { xml } = sample();
    const nfe = ok(
      parseFiscalXml(xml.replace(`<CNPJ>${EMIT}</CNPJ>`, '<CNPJ>12ABC34501DE35</CNPJ>')),
    ).nfes[0]!;
    expect(nfe.issues).toContainEqual({
      level: 'error',
      message: {
        code: 'nfe.keyFieldMismatch',
        params: { field: 'CNPJ', xml: '12ABC34501DE35', key: EMIT },
      },
    });
  });

  it('cDV diferente da chave', () => {
    const { xml, key } = sample();
    const dv = key.slice(-1);
    const other = dv === '0' ? '1' : '0';
    const nfe = ok(parseFiscalXml(xml.replace(`<cDV>${dv}</cDV>`, `<cDV>${other}</cDV>`))).nfes[0]!;
    expect(nfe.issues).toContainEqual({
      level: 'error',
      message: { code: 'nfe.keyFieldMismatch', params: { field: 'cDV', xml: other, key: dv } },
    });
  });

  it('mês de dhEmi diferente do AAMM da chave', () => {
    const { xml } = sample();
    const nfe = ok(parseFiscalXml(xml.replace('<dhEmi>2026-11-26', '<dhEmi>2026-10-26'))).nfes[0]!;
    expect(nfe.issues).toContainEqual({
      level: 'error',
      message: {
        code: 'nfe.aammMismatch',
        params: { aamm: '2611', dhEmi: '2026-10-26T12:00:00-03:00' },
      },
    });
  });

  it('Id sem a forma NFe + 44', () => {
    const { xml, key } = sample();
    const nfe = ok(parseFiscalXml(xml.replace(`Id="NFe${key}"`, 'Id="NFe123"'))).nfes[0]!;
    expect(nfe.key).toBeNull();
    expect(nfe.issues[0]).toEqual({
      level: 'error',
      message: { code: 'nfe.badId', params: { id: 'NFe123' } },
    });
  });

  it('chave inválida no Id', () => {
    const { xml, key } = sample();
    const bad = key.slice(0, 43) + (key[43] === '0' ? '1' : '0');
    const nfe = ok(parseFiscalXml(xml.replace(`Id="NFe${key}"`, `Id="NFe${bad}"`))).nfes[0]!;
    expect(nfe.key?.valid).toBe(false);
    expect(codes(nfe.issues)).toContain('nfe.keyInvalid');
  });

  it('versão diferente de 4.00 é aviso', () => {
    const { xml, key } = sample();
    const nfe = ok(
      parseFiscalXml(xml.replace(`Id="NFe${key}" versao="4.00"`, `Id="NFe${key}" versao="3.10"`)),
    ).nfes[0]!;
    expect(nfe.issues).toContainEqual({
      level: 'warning',
      message: { code: 'nfe.unsupportedVersion', params: { version: '3.10' } },
    });
  });
});

describe('parseFiscalXml: outros documentos', () => {
  const inner = (o: SampleOptions = {}) => sample(o).xml.replace(DECL, '');

  it('enviNFe com várias notas', () => {
    const doc = ok(
      parseFiscalXml(
        `<enviNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><idLote>1</idLote><indSinc>1</indSinc>${inner()}${inner({ nNF: 1235 })}</enviNFe>`,
      ),
    );
    expect(doc.root).toBe('enviNFe');
    expect(doc.batch).toEqual({ idLote: '1', indSinc: '1' });
    expect(doc.nfes.map((n) => n.summary.nNF)).toEqual(['1234', '1235']);
    expect(doc.nfes.every((n) => n.key?.valid)).toBe(true);
  });

  it('retEnviNFe com protocolo síncrono', () => {
    const doc = ok(
      parseFiscalXml(`<retEnviNFe xmlns="${NFE_NAMESPACE}" versao="4.00">
  <tpAmb>2</tpAmb><verAplic>X</verAplic><cStat>104</cStat><xMotivo>Lote processado</xMotivo>
  <cUF>35</cUF><dhRecbto>2026-11-26T12:00:01-03:00</dhRecbto>
  <protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${sample().key}</chNFe><cStat>539</cStat>
  <xMotivo>Rejeição de exemplo</xMotivo></infProt></protNFe>
</retEnviNFe>`),
    );
    expect(doc.root).toBe('retEnviNFe');
    expect(doc.response).toMatchObject({ cStat: '104', xMotivo: 'Lote processado', tpAmb: '2' });
    expect(doc.protocols[0]).toMatchObject({ cStat: '539', xMotivo: 'Rejeição de exemplo' });
    expect(doc.nfes).toEqual([]);
  });

  it('retEnviNFe assíncrono traz o recibo', () => {
    const doc = ok(
      parseFiscalXml(
        `<retEnviNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><tpAmb>2</tpAmb><cStat>103</cStat><xMotivo>Lote recebido</xMotivo><infRec><nRec>351000000000001</nRec><tMed>1</tMed></infRec></retEnviNFe>`,
      ),
    );
    expect(doc.response?.nRec).toBe('351000000000001');
    expect(doc.protocols).toEqual([]);
  });

  it('protNFe avulso', () => {
    const doc = ok(
      parseFiscalXml(
        `<protNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><infProt><chNFe>${sample().key}</chNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>`,
      ),
    );
    expect(doc.root).toBe('protNFe');
    expect(doc.protocols[0]?.cStat).toBe('100');
  });

  it('protNFe sem infProt', () => {
    const doc = ok(parseFiscalXml(`<protNFe xmlns="${NFE_NAMESPACE}"/>`));
    expect(codes(doc.issues)).toEqual(['nfe.noInfProt']);
  });

  it('nfeProc sem NFe, NFe sem infNFe e lote vazio', () => {
    for (const xml of [
      `<nfeProc xmlns="${NFE_NAMESPACE}"/>`,
      `<NFe xmlns="${NFE_NAMESPACE}"><x/></NFe>`,
      `<enviNFe xmlns="${NFE_NAMESPACE}"/>`,
    ]) {
      expect(codes(ok(parseFiscalXml(xml)).issues), xml).toEqual(['nfe.noInfNFe']);
    }
  });

  it('namespace errado é aviso', () => {
    const doc = ok(
      parseFiscalXml(sample().xml.replace(NFE_NAMESPACE, 'http://exemplo.invalido/nfe')),
    );
    expect(doc.issues).toEqual([
      {
        level: 'warning',
        message: { code: 'nfe.wrongNamespace', params: { ns: 'http://exemplo.invalido/nfe' } },
      },
    ]);
  });

  it('raiz desconhecida', () => {
    expect(parseFiscalXml('<cteProc/>')).toEqual({
      ok: false,
      error: { message: { code: 'nfe.unsupportedRoot', params: { root: 'cteProc' } } },
    });
  });

  it('XML mal formado devolve o erro do tokenizador, sem lançar', () => {
    const r = parseFiscalXml('<NFe>\n  <infNFe Id="x"\n</NFe>');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message.code).toMatch(/^xml\./);
      expect(r.error.line).toBeGreaterThanOrEqual(1);
    }
  });

  it('DOCTYPE é recusado (XXE)', () => {
    const r = parseFiscalXml(
      '<?xml version="1.0"?><!DOCTYPE NFe [<!ENTITY x SYSTEM "file:///etc/passwd">]><NFe>&x;</NFe>',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.code).toBe('xml.doctype');
  });

  it('campos ausentes são normais e não quebram a leitura', () => {
    const doc = ok(
      parseFiscalXml(
        `<NFe xmlns="${NFE_NAMESPACE}"><infNFe Id="NFe${sample().key}" versao="4.00"/></NFe>`,
      ),
    );
    const nfe = doc.nfes[0]!;
    expect(nfe.items).toEqual([]);
    expect(nfe.summary.emitName).toBeUndefined();
    // Sem ide, nada é comparado com a chave.
    expect(codes(nfe.issues)).toEqual(['nfe.noProtocol']);
  });

  it('o resultado atravessa structuredClone (Web Worker)', () => {
    const doc = ok(parseFiscalXml(sample({ withProtocol: true }).xml));
    expect(structuredClone(doc)).toEqual(doc);
  });
});

describe('tabelas e rótulos', () => {
  it('tpEmis segue o XSD atual (3 é NFF, 9 vale para NFC-e e NF-e Simplificado Tipo 2)', () => {
    expect(describeCode('tpEmis', '3', 'pt-BR')).toBe('Regime Especial NFF (NT 2021.002)');
    expect(describeCode('tpEmis', '9', 'pt-BR')).toMatch(/NFC-e e da NF-e com DANFE Simplificado/);
  });

  it('código ou campo fora da tabela', () => {
    expect(describeCode('tpAmb', '3', 'pt-BR')).toBeUndefined();
    expect(describeCode('tPag', '01', 'pt-BR')).toBeUndefined();
  });

  it('toda entrada das tabelas tem os dois idiomas', () => {
    for (const [field, table] of Object.entries(CODE_TABLES)) {
      for (const [code, d] of Object.entries(table)) {
        expect(d['pt-BR'], `${field}=${code}`).toBeTruthy();
        expect(d.en, `${field}=${code}`).toBeTruthy();
      }
    }
  });

  it('rótulo conhecido e desconhecido', () => {
    expect(fieldLabel('vNF', 'pt-BR')).toBe('Valor da nota');
    expect(fieldLabel('vNF', 'en')).toBe('Invoice total');
    expect(fieldLabel('tagNova', 'pt-BR')).toBe('tagNova');
  });
});
