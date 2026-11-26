import { xmlTreeToJson, parseXmlTree } from '@sakura-tools/tools/xmlTree';
import { describe, expect, it } from 'vitest';
import { compareXml, flattenXml } from './compare';
import { csvCell, itemsToCsv } from './export';
import { NFE_NAMESPACE, parseFiscalXml, type FiscalDocument, type FiscalParseResult } from './nfe';
import { buildSampleCancelEvent, buildSampleNfe } from './sample';

// Tudo fictício, em homologação.
const DATE = new Date(Date.UTC(2026, 10, 26, 15, 0, 0));
const base = () =>
  buildSampleNfe({ emitCnpj: '11222333000181', destCpf: '52998224725', date: DATE });

function ok(r: FiscalParseResult): FiscalDocument {
  if (!r.ok) throw new Error(`esperava sucesso: ${r.error.message.code}`);
  return r;
}
const codes = (issues: { message: { code: string } }[]) => issues.map((i) => i.message.code);

describe('eventos', () => {
  it('procEventoNFe de cancelamento com retorno', () => {
    const { key } = base();
    const doc = ok(parseFiscalXml(buildSampleCancelEvent({ key, date: DATE, withReturn: true })));
    expect(doc.root).toBe('procEventoNFe');
    expect(doc.nfes).toEqual([]);
    const ev = doc.events[0]!;
    expect(ev).toMatchObject({
      id: `ID110111${key}01`,
      tpEvento: '110111',
      descEvento: 'Cancelamento',
      nSeqEvento: '1',
      chNFe: key,
      tpAmb: '2',
      author: '11222333000181',
    });
    expect(ev.ret).toMatchObject({
      cStat: '135',
      xMotivo: 'Evento registrado e vinculado a NF-e',
      nProt: '135000000000002',
    });
    expect(ev.detEvento?.children.map((c) => c.local)).toEqual(['descEvento', 'nProt', 'xJust']);
    expect(codes(ev.issues)).toEqual(['nfe.homologation']);
  });

  it('evento sem retorno', () => {
    const { key } = base();
    const doc = ok(parseFiscalXml(buildSampleCancelEvent({ key, date: DATE })));
    expect(doc.root).toBe('evento');
    expect(codes(doc.events[0]!.issues)).toEqual(['nfe.homologation', 'nfe.noEventReturn']);
  });

  it('Id do evento diferente de ID + tpEvento + chave + nSeqEvento', () => {
    const { key } = base();
    const xml = buildSampleCancelEvent({ key, date: DATE, withReturn: true }).replace(
      `Id="ID110111${key}01"`,
      `Id="ID110110${key}01"`,
    );
    const ev = ok(parseFiscalXml(xml)).events[0]!;
    expect(ev.issues).toContainEqual({
      level: 'error',
      message: {
        code: 'nfe.eventIdMismatch',
        params: { id: `ID110110${key}01`, expected: `ID110111${key}01` },
      },
    });
  });

  it('retorno de outra chave ou outro evento', () => {
    const { key } = base();
    const other = key.slice(0, 43) + (key[43] === '0' ? '1' : '0');
    const xml = buildSampleCancelEvent({ key, date: DATE, withReturn: true }).replace(
      `<chNFe>${key}</chNFe>\n      <tpEvento>110111</tpEvento><xEvento>`,
      `<chNFe>${other}</chNFe>\n      <tpEvento>110110</tpEvento><xEvento>`,
    );
    const ev = ok(parseFiscalXml(xml)).events[0]!;
    const mismatches = ev.issues.filter((i) => i.message.code === 'nfe.eventReturnMismatch');
    expect(mismatches.map((i) => i.message.params?.field)).toEqual(['chNFe', 'tpEvento']);
  });

  it('chave inválida no evento', () => {
    const { key } = base();
    const bad = key.slice(0, 43) + (key[43] === '0' ? '1' : '0');
    const xml = buildSampleCancelEvent({ key: bad, date: DATE });
    expect(codes(ok(parseFiscalXml(xml)).events[0]!.issues)).toContain('nfe.eventKeyInvalid');
  });

  it('retEvento avulso', () => {
    const doc = ok(
      parseFiscalXml(
        `<retEvento xmlns="${NFE_NAMESPACE}" versao="1.00"><infEvento><cStat>573</cStat><xMotivo>Rejeição de exemplo</xMotivo></infEvento></retEvento>`,
      ),
    );
    expect(doc.root).toBe('retEvento');
    expect(doc.events[0]?.ret?.cStat).toBe('573');
  });

  it('evento e retEvento sem infEvento', () => {
    expect(
      codes(ok(parseFiscalXml(`<evento xmlns="${NFE_NAMESPACE}"/>`)).events[0]!.issues),
    ).toEqual(['nfe.noInfEvento']);
    expect(codes(ok(parseFiscalXml(`<retEvento xmlns="${NFE_NAMESPACE}"/>`)).issues)).toEqual([
      'nfe.noInfEvento',
    ]);
  });
});

describe('exportação', () => {
  it('itens em CSV com separador ; e CRLF', () => {
    const doc = ok(parseFiscalXml(base().xml));
    expect(itemsToCsv(doc.nfes[0]!.items)).toBe(
      'nItem;cProd;xProd;NCM;CFOP;uCom;qCom;vUnCom;vProd;vDesc\r\n' +
        '1;CAFE-01;CAFE TORRADO 500G (EXEMPLO);09012100;5102;UN;2.0000;25.0000000000;50.00;\r\n' +
        '2;CAFE-02;CAFE EM GRAOS 1KG (EXEMPLO);09012100;5102;UN;1.0000;100.0000000000;100.00;\r\n',
    );
  });

  it('célula com ; ou aspas é escapada, e fórmula é neutralizada', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@SUM')).toBe("'@SUM");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell(undefined)).toBe('');
    expect(csvCell('linha\nnova')).toBe('"linha\nnova"');
  });

  it('XML em JSON: atributos, texto, repetidos em lista e namespace preservado no nome', () => {
    const json = xmlTreeToJson(
      parseXmlTree(
        `<a xmlns:ds="http://x" v="1"><b>1</b><b>2</b><c x="y">t</c><ds:S>z</ds:S><e/></a>`,
      ),
    );
    expect(json).toEqual({
      a: { '@v': '1', b: ['1', '2'], c: { '@x': 'y', '#text': 't' }, 'ds:S': 'z', e: '' },
    });
  });

  it('NF-e de exemplo em JSON', () => {
    const doc = ok(parseFiscalXml(base().xml));
    const json = xmlTreeToJson(doc.tree) as Record<string, Record<string, Record<string, unknown>>>;
    const inf = json.NFe!.infNFe as Record<string, unknown>;
    expect(inf['@versao']).toBe('4.00');
    expect(Array.isArray(inf.det)).toBe(true);
    expect((inf.ide as Record<string, string>).nNF).toBe('1234');
  });
});

describe('comparador', () => {
  it('mesma nota não tem diferença', () => {
    const { xml } = base();
    const r = compareXml(xml, xml);
    expect(r.ok && r.diffs).toEqual([]);
    expect(r.ok && r.compared).toBeGreaterThan(50);
  });

  it('valor alterado, campo só de um lado e item a mais', () => {
    const { xml } = base();
    const right = xml
      .replace('<vNF>150.00</vNF>', '<vNF>151.00</vNF>')
      .replace('<xFant>LOJA EXEMPLO</xFant>', '')
      .replace('<modFrete>9</modFrete>', '<modFrete>9</modFrete><vol><qVol>1</qVol></vol>');
    const r = compareXml(xml, right);
    if (!r.ok) throw new Error('falhou');
    expect(r.diffs).toEqual(
      expect.arrayContaining([
        { path: 'NFe/infNFe/total/ICMSTot/vNF', kind: 'changed', left: '150.00', right: '151.00' },
        { path: 'NFe/infNFe/emit/xFant', kind: 'onlyLeft', left: 'LOJA EXEMPLO' },
        { path: 'NFe/infNFe/transp/vol/qVol', kind: 'onlyRight', right: '1' },
      ]),
    );
    expect(r.diffs).toHaveLength(3);
  });

  it('itens repetidos têm índice e atributo vira @', () => {
    const map = flattenXml(parseXmlTree(base().xml));
    expect(map.get('NFe/infNFe/det[2]/prod/vProd')).toBe('100.00');
    expect(map.get('NFe/infNFe/det[1]/@nItem')).toBe('1');
    expect(map.has('NFe/infNFe/@Id')).toBe(true);
  });

  it('assinatura é ignorada por padrão e pode ser incluída', () => {
    const sig = (v: string) =>
      base().xml.replace(
        '</infNFe>',
        `</infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignatureValue>${v}</SignatureValue></Signature>`,
      );
    const r = compareXml(sig('AAA'), sig('BBB'));
    expect(r.ok && r.diffs).toEqual([]);
    const r2 = compareXml(sig('AAA'), sig('BBB'), { ignoreSignature: false });
    expect(r2.ok && r2.diffs.map((d) => d.path)).toEqual(['NFe/Signature/SignatureValue']);
  });

  it('erro de leitura diz de que lado veio', () => {
    const r = compareXml(base().xml, '<a><b></a>');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.side).toBe('right');
      expect(r.error.message.code).toBe('xml.mismatchedClose');
    }
    const empty = compareXml('  ', '<a/>');
    expect(!empty.ok && empty.side).toBe('left');
  });

  it('DOCTYPE é recusado na comparação', () => {
    const r = compareXml('<!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>', '<a/>');
    expect(!r.ok && r.error.message.code).toBe('xml.doctype');
  });
});
