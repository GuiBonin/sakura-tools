/**
 * Leitura de XML de NF-e (modelo 55) e NFC-e (modelo 65), layout 4.00.
 *
 * Documentos reconhecidos (raiz): `NFe`, `nfeProc` (NF-e com protocolo),
 * `enviNFe` (lote enviado, até 50 NF-e), `retEnviNFe` (retorno do envio, com
 * protocolo no processamento síncrono) e `protNFe` (protocolo avulso).
 * Estrutura conforme o `leiauteNFe_v4.00.xsd` (PL_010h).
 *
 * O que esta leitura NÃO faz: conferir a assinatura digital, validar contra
 * o XSD, consultar a SEFAZ ou recalcular tributos. Um protocolo presente no
 * XML não é tratado como prova de autorização.
 */
import { validateAccessKey, type AccessKeyResult } from '@sakura-tools/tools/accessKey';
import { msg, type ToolMessage } from '@sakura-tools/tools/messages';
import { XmlError } from '@sakura-tools/tools/xml';
import {
  childOf,
  childrenOf,
  parseXmlTree,
  textOf,
  type XmlElement,
} from '@sakura-tools/tools/xmlTree';

export const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
export const SUPPORTED_ROOTS = ['NFe', 'nfeProc', 'enviNFe', 'retEnviNFe', 'protNFe'] as const;
export type FiscalRoot = (typeof SUPPORTED_ROOTS)[number];

export type IssueLevel = 'error' | 'warning' | 'info';

export interface FiscalIssue {
  level: IssueLevel;
  message: ToolMessage;
}

export interface ProtocolView {
  tpAmb?: string;
  verAplic?: string;
  chNFe?: string;
  dhRecbto?: string;
  nProt?: string;
  digVal?: string;
  cStat?: string;
  xMotivo?: string;
  /** Grupo `infProt` inteiro, para a visão de todos os campos. */
  node: XmlElement;
}

export interface NfeItem {
  nItem: string;
  cProd?: string;
  xProd?: string;
  NCM?: string;
  CFOP?: string;
  uCom?: string;
  qCom?: string;
  vUnCom?: string;
  vProd?: string;
  vDesc?: string;
  prod?: XmlElement;
  imposto?: XmlElement;
  infAdProd?: string;
}

export interface NfeSummary {
  mod?: string;
  serie?: string;
  nNF?: string;
  dhEmi?: string;
  natOp?: string;
  tpAmb?: string;
  tpNF?: string;
  finNFe?: string;
  tpEmis?: string;
  vNF?: string;
  emitName?: string;
  emitDoc?: string;
  destName?: string;
  destDoc?: string;
}

export interface NfeView {
  /** Atributo `Id` do `infNFe` (`NFe` + chave). */
  id?: string;
  version?: string;
  /** Chave tirada do `Id`, validada. `null` quando o `Id` não tem a forma `NFe` + 44. */
  key: AccessKeyResult | null;
  summary: NfeSummary;
  items: NfeItem[];
  infNFe: XmlElement;
  protocol: ProtocolView | null;
  issues: FiscalIssue[];
}

export interface FiscalDocument {
  ok: true;
  root: FiscalRoot;
  version?: string;
  nfes: NfeView[];
  /** Protocolos fora de `nfeProc` (protNFe avulso ou dentro de retEnviNFe). */
  protocols: ProtocolView[];
  batch?: { idLote?: string; indSinc?: string };
  response?: { tpAmb?: string; cStat?: string; xMotivo?: string; dhRecbto?: string; nRec?: string };
  /** Avisos do documento como um todo. */
  issues: FiscalIssue[];
}

export interface FiscalFailure {
  ok: false;
  error: { message: ToolMessage; line?: number; column?: number };
}

export type FiscalParseResult = FiscalDocument | FiscalFailure;

const issue = (level: IssueLevel, message: ToolMessage): FiscalIssue => ({ level, message });

function readProtocol(protNFe: XmlElement): ProtocolView | null {
  const inf = childOf(protNFe, 'infProt');
  if (!inf) return null;
  return {
    tpAmb: textOf(inf, 'tpAmb'),
    verAplic: textOf(inf, 'verAplic'),
    chNFe: textOf(inf, 'chNFe'),
    dhRecbto: textOf(inf, 'dhRecbto'),
    nProt: textOf(inf, 'nProt'),
    digVal: textOf(inf, 'digVal'),
    cStat: textOf(inf, 'cStat'),
    xMotivo: textOf(inf, 'xMotivo'),
    node: inf,
  };
}

const docOf = (party: XmlElement | undefined) =>
  textOf(party, 'CNPJ') ?? textOf(party, 'CPF') ?? textOf(party, 'idEstrangeiro');

/**
 * Compara os campos da chave com os do XML. Cada diferença é um erro, porque
 * a chave é formada por esses campos (`Id` = "NFe" + chave).
 */
function compareKeyWithFields(key: AccessKeyResult, infNFe: XmlElement): FiscalIssue[] {
  const p = key.parts;
  if (!p) return [];
  const ide = childOf(infNFe, 'ide');
  const emit = childOf(infNFe, 'emit');
  const out: FiscalIssue[] = [];
  const cmp = (field: string, xml: string | undefined, inKey: string, pad: number) => {
    if (xml === undefined) return;
    const norm = /^\d+$/.test(xml) ? xml.padStart(pad, '0') : xml.toUpperCase();
    if (norm !== inKey) {
      out.push(issue('error', msg('nfe.keyFieldMismatch', { field, xml, key: inKey })));
    }
  };
  cmp('cUF', textOf(ide, 'cUF'), p.cUF, 2);
  cmp('mod', textOf(ide, 'mod'), p.mod, 2);
  cmp('serie', textOf(ide, 'serie'), p.serie, 3);
  cmp('nNF', textOf(ide, 'nNF'), p.nNF, 9);
  cmp('tpEmis', textOf(ide, 'tpEmis'), p.tpEmis, 1);
  cmp('cNF', textOf(ide, 'cNF'), p.cNF, 8);
  cmp('cDV', textOf(ide, 'cDV'), p.cDV, 1);
  const emitDoc = docOf(emit);
  if (emitDoc !== undefined) cmp(textOf(emit, 'CNPJ') ? 'CNPJ' : 'CPF', emitDoc, p.emitter, 14);

  // AAMM da chave contra o ano e o mês de dhEmi (AAAA-MM-DDThh:mm:ssTZD).
  const dhEmi = textOf(ide, 'dhEmi');
  const m = dhEmi ? /^\d{2}(\d{2})-(\d{2})/.exec(dhEmi) : null;
  if (dhEmi && m && `${m[1]}${m[2]}` !== p.aamm) {
    out.push(issue('error', msg('nfe.aammMismatch', { aamm: p.aamm, dhEmi })));
  }
  return out;
}

function readNfe(nfe: XmlElement, protNFe: XmlElement | undefined): NfeView | null {
  const infNFe = childOf(nfe, 'infNFe');
  if (!infNFe) return null;
  const issues: FiscalIssue[] = [];
  const id = infNFe.attrs.Id;
  const version = infNFe.attrs.versao;

  let key: AccessKeyResult | null = null;
  if (id && /^NFe[0-9A-Za-z]{44}$/.test(id)) {
    key = validateAccessKey(id.slice(3));
    if (!key.valid) issues.push(issue('error', msg('nfe.keyInvalid')));
    issues.push(...compareKeyWithFields(key, infNFe));
  } else {
    issues.push(issue('error', msg('nfe.badId', { id: id ?? '' })));
  }
  if (version && version !== '4.00') {
    issues.push(issue('warning', msg('nfe.unsupportedVersion', { version })));
  }

  const ide = childOf(infNFe, 'ide');
  const emit = childOf(infNFe, 'emit');
  const dest = childOf(infNFe, 'dest');
  const summary: NfeSummary = {
    mod: textOf(ide, 'mod'),
    serie: textOf(ide, 'serie'),
    nNF: textOf(ide, 'nNF'),
    dhEmi: textOf(ide, 'dhEmi'),
    natOp: textOf(ide, 'natOp'),
    tpAmb: textOf(ide, 'tpAmb'),
    tpNF: textOf(ide, 'tpNF'),
    finNFe: textOf(ide, 'finNFe'),
    tpEmis: textOf(ide, 'tpEmis'),
    vNF: textOf(infNFe, 'total/ICMSTot/vNF'),
    emitName: textOf(emit, 'xNome'),
    emitDoc: docOf(emit),
    destName: textOf(dest, 'xNome'),
    destDoc: docOf(dest),
  };
  if (summary.tpAmb === '2') issues.push(issue('warning', msg('nfe.homologation')));

  const items: NfeItem[] = childrenOf(infNFe, 'det').map((det, i) => {
    const prod = childOf(det, 'prod');
    return {
      nItem: det.attrs.nItem ?? String(i + 1),
      cProd: textOf(prod, 'cProd'),
      xProd: textOf(prod, 'xProd'),
      NCM: textOf(prod, 'NCM'),
      CFOP: textOf(prod, 'CFOP'),
      uCom: textOf(prod, 'uCom'),
      qCom: textOf(prod, 'qCom'),
      vUnCom: textOf(prod, 'vUnCom'),
      vProd: textOf(prod, 'vProd'),
      vDesc: textOf(prod, 'vDesc'),
      prod,
      imposto: childOf(det, 'imposto'),
      infAdProd: textOf(det, 'infAdProd'),
    };
  });

  const protocol = protNFe ? readProtocol(protNFe) : null;
  if (!protocol) {
    issues.push(issue('info', msg('nfe.noProtocol')));
  } else if (key && protocol.chNFe && protocol.chNFe !== key.normalized) {
    issues.push(
      issue(
        'error',
        msg('nfe.protocolKeyMismatch', { protocol: protocol.chNFe, key: key.normalized }),
      ),
    );
  }

  return { id, version, key, summary, items, infNFe, protocol, issues };
}

/** Lê o XML e devolve as NF-e encontradas, já conferidas. Nunca lança. */
export function parseFiscalXml(input: string): FiscalParseResult {
  let root: XmlElement;
  try {
    root = parseXmlTree(input);
  } catch (err) {
    if (err instanceof XmlError) {
      return { ok: false, error: { message: err.toolMessage, line: err.line, column: err.column } };
    }
    throw err;
  }

  if (!(SUPPORTED_ROOTS as readonly string[]).includes(root.local)) {
    return {
      ok: false,
      error: { message: msg('nfe.unsupportedRoot', { root: root.name }) },
    };
  }
  const kind = root.local as FiscalRoot;
  const issues: FiscalIssue[] = [];
  if (root.ns !== NFE_NAMESPACE) {
    issues.push(issue('warning', msg('nfe.wrongNamespace', { ns: root.ns || '—' })));
  }

  const doc: FiscalDocument = {
    ok: true,
    root: kind,
    version: root.attrs.versao,
    nfes: [],
    protocols: [],
    issues,
  };
  const addNfe = (nfe: XmlElement, prot?: XmlElement) => {
    const view = readNfe(nfe, prot);
    if (view) doc.nfes.push(view);
    else issues.push(issue('error', msg('nfe.noInfNFe')));
  };

  switch (kind) {
    case 'NFe':
      addNfe(root);
      break;
    case 'nfeProc': {
      const nfe = childOf(root, 'NFe');
      if (nfe) addNfe(nfe, childOf(root, 'protNFe'));
      else issues.push(issue('error', msg('nfe.noInfNFe')));
      break;
    }
    case 'enviNFe': {
      doc.batch = { idLote: textOf(root, 'idLote'), indSinc: textOf(root, 'indSinc') };
      const list = childrenOf(root, 'NFe');
      if (list.length === 0) issues.push(issue('error', msg('nfe.noInfNFe')));
      for (const nfe of list) addNfe(nfe);
      break;
    }
    case 'retEnviNFe': {
      doc.response = {
        tpAmb: textOf(root, 'tpAmb'),
        cStat: textOf(root, 'cStat'),
        xMotivo: textOf(root, 'xMotivo'),
        dhRecbto: textOf(root, 'dhRecbto'),
        nRec: textOf(root, 'infRec/nRec'),
      };
      const prot = childOf(root, 'protNFe');
      const view = prot ? readProtocol(prot) : null;
      if (view) doc.protocols.push(view);
      break;
    }
    case 'protNFe': {
      const view = readProtocol(root);
      if (view) doc.protocols.push(view);
      else issues.push(issue('error', msg('nfe.noInfProt')));
      break;
    }
  }
  return doc;
}
