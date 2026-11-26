/**
 * NF-e fictícia para exemplo e testes. Emitida em homologação, com empresa,
 * pessoa e valores inventados. Não representa nenhuma nota real.
 *
 * A estrutura segue o layout 4.00 (PL_010h), inclusive o grupo IBSCBS. Os
 * valores são só ilustrativos: não são cálculo tributário.
 */
import { buildAccessKey } from '@sakura-tools/tools/accessKey';
import { generateCnpj, generateCpf } from '@sakura-tools/tools/brazil';
import { NFE_NAMESPACE } from './nfe';

export interface SampleOptions {
  emitCnpj?: string;
  destCpf?: string;
  nNF?: number;
  cNF?: string;
  /** Data de emissão. Padrão: agora. */
  date?: Date;
  withProtocol?: boolean;
  mod?: '55' | '65';
}

const pad = (n: number, size: number) => String(n).padStart(size, '0');

function isoWithOffset(d: Date): string {
  // Horário de Brasília fixo (-03:00) para o exemplo ficar previsível.
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

export function buildSampleNfe(opts: SampleOptions = {}): { xml: string; key: string } {
  const date = opts.date ?? new Date();
  const emitCnpj = opts.emitCnpj ?? generateCnpj();
  const destCpf = opts.destCpf ?? generateCpf();
  const nNF = opts.nNF ?? 1234;
  const cNF = opts.cNF ?? '48271934';
  const mod = opts.mod ?? '55';
  const dhEmi = isoWithOffset(date);
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const key = buildAccessKey({
    cUF: '35',
    aamm,
    emitter: emitCnpj,
    mod,
    serie: '001',
    nNF: pad(nNF, 9),
    tpEmis: '1',
    cNF,
  });

  const item = (
    n: number,
    cProd: string,
    xProd: string,
    q: string,
    vUn: string,
    v: string,
    vIcms: string,
  ) => `
      <det nItem="${n}">
        <prod>
          <cProd>${cProd}</cProd><cEAN>SEM GTIN</cEAN><xProd>${xProd}</xProd><NCM>09012100</NCM>
          <CFOP>5102</CFOP><uCom>UN</uCom><qCom>${q}</qCom><vUnCom>${vUn}</vUnCom><vProd>${v}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>${q}</qTrib><vUnTrib>${vUn}</vUnTrib><indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>${v}</vBC><pICMS>18.00</pICMS><vICMS>${vIcms}</vICMS></ICMS00></ICMS>
          <PIS><PISAliq><CST>01</CST><vBC>${v}</vBC><pPIS>1.65</pPIS><vPIS>0.00</vPIS></PISAliq></PIS>
          <COFINS><COFINSAliq><CST>01</CST><vBC>${v}</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSAliq></COFINS>
          <IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib>
            <gIBSCBS><vBC>${v}</vBC>
              <gIBSUF><pIBSUF>0.10</pIBSUF><vIBSUF>0.00</vIBSUF></gIBSUF>
              <gIBSMun><pIBSMun>0.00</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun>
              <vIBS>0.00</vIBS>
              <gCBS><pCBS>0.90</pCBS><vCBS>0.00</vCBS></gCBS>
            </gIBSCBS>
          </IBSCBS>
        </imposto>
      </det>`;

  const protocol = opts.withProtocol
    ? `
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb><verAplic>EXEMPLO-1.0</verAplic><chNFe>${key}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto><nProt>135000000000001</nProt>
      <cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>`
    : '';

  const nfe = `<NFe xmlns="${NFE_NAMESPACE}">
    <infNFe Id="NFe${key}" versao="4.00">
      <ide>
        <cUF>35</cUF><cNF>${cNF}</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>${mod}</mod><serie>1</serie>
        <nNF>${nNF}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3550308</cMunFG>
        <tpImp>${mod === '65' ? '4' : '1'}</tpImp><tpEmis>1</tpEmis><cDV>${key.slice(-1)}</cDV><tpAmb>2</tpAmb>
        <finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>EXEMPLO-1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${emitCnpj}</CNPJ><xNome>EMPRESA FICTICIA DE TESTE LTDA</xNome><xFant>LOJA EXEMPLO</xFant>
        <enderEmit><xLgr>RUA DE EXEMPLO</xLgr><nro>100</nro><xBairro>CENTRO</xBairro><cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun><UF>SP</UF><CEP>01000000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit>
        <IE>ISENTO</IE><CRT>3</CRT>
      </emit>
      <dest>
        <CPF>${destCpf}</CPF><xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>
        <indIEDest>9</indIEDest>
      </dest>
      ${item(1, 'CAFE-01', 'CAFE TORRADO 500G (EXEMPLO)', '2.0000', '25.0000000000', '50.00', '9.00')}
      ${item(2, 'CAFE-02', 'CAFE EM GRAOS 1KG (EXEMPLO)', '1.0000', '100.0000000000', '100.00', '18.00')}
      <total>
        <ICMSTot>
          <vBC>150.00</vBC><vICMS>27.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST>
          <vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>150.00</vProd><vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>150.00</vNF>
        </ICMSTot>
        <IBSCBSTot>
          <vBCIBSCBS>150.00</vBCIBSCBS>
          <gIBS><gIBSUF><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSUF>0.00</vIBSUF></gIBSUF>
            <gIBSMun><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSMun>0.00</vIBSMun></gIBSMun>
            <vIBS>0.00</vIBS><vCredPres>0.00</vCredPres><vCredPresCondSus>0.00</vCredPresCondSus></gIBS>
          <gCBS><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vCBS>0.00</vCBS><vCredPres>0.00</vCredPres>
            <vCredPresCondSus>0.00</vCredPresCondSus></gCBS>
        </IBSCBSTot>
      </total>
      <transp><modFrete>9</modFrete></transp>
      <pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>150.00</vPag></detPag></pag>
      <infAdic><infCpl>Documento ficticio gerado para teste. Sem valor fiscal.</infCpl></infAdic>
    </infNFe>
  </NFe>`;

  const xml = opts.withProtocol
    ? `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="${NFE_NAMESPACE}" versao="4.00">
  ${nfe}${protocol}
</nfeProc>`
    : `<?xml version="1.0" encoding="UTF-8"?>\n${nfe}`;
  return { xml, key };
}
