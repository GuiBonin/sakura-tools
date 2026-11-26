import { Accordion, Badge, Button, Select, Spinner, Tabs } from '@guibonin/sakura-ui';
import { describeCode } from '@sakura-tools/fiscal/codes';
import { fieldLabel } from '@sakura-tools/fiscal/labels';
import type { FiscalDocument, FiscalIssue, NfeView, ProtocolView } from '@sakura-tools/fiscal/nfe';
import { buildSampleNfe } from '@sakura-tools/fiscal/sample';
import { formatAccessKey } from '@sakura-tools/tools/accessKey';
import { msg } from '@sakura-tools/tools/messages';
import { XML_MAX_INPUT } from '@sakura-tools/tools/xml';
import type { XmlElement } from '@sakura-tools/tools/xmlTree';
import { Download, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { downloadBlob, Notice, Output, ResultRow, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { parseNfeIsolated, type NfeRun } from '../lib/nfeRunner';
import { useResultFor } from '../lib/useResultFor';

const MAX_MB = XML_MAX_INPUT / 1024 / 1024;

function useMoney() {
  const { locale } = useI18n();
  return (v: string | undefined) => {
    if (v === undefined || !/^-?\d+(\.\d+)?$/.test(v)) return v ?? '';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(Number(v));
  };
}

/** Valor com a descrição do código, quando a tabela do XSD descreve o campo. */
function CodeValue({ field, value }: { field: string; value: string }) {
  const { locale } = useI18n();
  const d = describeCode(field, value, locale);
  return (
    <>
      <code>{value}</code>
      {d && <span className="st-muted"> · {d}</span>}
    </>
  );
}

/**
 * Mostra qualquer grupo do XML: folhas viram linhas "rótulo: valor" e
 * subgrupos viram seções. Campos ausentes simplesmente não aparecem.
 */
function GroupView({ el, level = 3 }: { el: XmlElement; level?: 3 | 4 | 5 }) {
  const { locale } = useI18n();
  const leaves = el.children.filter((c) => c.children.length === 0);
  const groups = el.children.filter((c) => c.children.length > 0);
  const attrs = Object.entries(el.attrs).filter(([k]) => k !== 'versao');
  const H = `h${Math.min(level + 1, 6)}` as 'h4';
  return (
    <div className="st-group">
      {(leaves.length > 0 || attrs.length > 0) && (
        <dl className="st-dl">
          {attrs.map(([k, v]) => (
            <Row key={`@${k}`} label={k}>
              <code>{v}</code>
            </Row>
          ))}
          {leaves.map((c, i) => (
            <Row key={`${c.local}-${i}`} label={fieldLabel(c.local, locale)} tag={c.local}>
              <CodeValue field={c.local} value={c.text.trim()} />
            </Row>
          ))}
        </dl>
      )}
      {groups.map((g, i) => (
        <section key={`${g.local}-${i}`} className="st-group__sub">
          <H className="st-group__title">
            {fieldLabel(g.local, locale)} <span className="st-muted st-mono">{g.local}</span>
          </H>
          <GroupView el={g} level={Math.min(level + 1, 5) as 4 | 5} />
        </section>
      ))}
    </div>
  );
}

function Row({ label, tag, children }: { label: string; tag?: string; children: ReactNode }) {
  return (
    <>
      <dt title={tag}>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function IssueList({ issues }: { issues: FiscalIssue[] }) {
  const { tr, em } = useI18n();
  if (issues.length === 0) return null;
  const by = (level: FiscalIssue['level']) => issues.filter((i) => i.level === level);
  const block = (level: FiscalIssue['level'], tone: 'danger' | 'warning' | 'info', title: string) =>
    by(level).length > 0 && (
      <Notice tone={tone} title={title}>
        <ul className="st-issues">
          {by(level).map((i, n) => (
            <li key={n}>{em(i.message)}</li>
          ))}
        </ul>
      </Notice>
    );
  return (
    <>
      {block('error', 'danger', tr('Problemas encontrados', 'Problems found'))}
      {block('warning', 'warning', tr('Atenção', 'Heads up'))}
      {block('info', 'info', tr('Observações', 'Notes'))}
    </>
  );
}

function ProtocolBlock({ p }: { p: ProtocolView }) {
  const { tr } = useI18n();
  return (
    <div className="st-stack">
      <Notice tone="warning" title={tr('Protocolo não verificado', 'Protocol not verified')}>
        {tr(
          'O protocolo é mostrado como está no XML. A assinatura não é conferida e a SEFAZ não é consultada, então isto não comprova que a nota foi autorizada.',
          'The protocol is shown as it appears in the XML. The signature is not checked and SEFAZ is not queried, so this does not prove the invoice was authorized.',
        )}
      </Notice>
      <GroupView el={p.node} />
    </div>
  );
}

function NfeDetail({
  nfe,
  formatted,
  xml,
}: {
  nfe: NfeView;
  formatted: string | null;
  xml: string;
}) {
  const { tr, locale } = useI18n();
  const money = useMoney();
  const s = nfe.summary;
  const model = s.mod === '65' ? 'NFC-e' : s.mod === '55' ? 'NF-e' : `mod ${s.mod ?? '?'}`;
  const ide = nfe.infNFe.children.find((c) => c.local === 'ide');
  const emit = nfe.infNFe.children.find((c) => c.local === 'emit');
  const dest = nfe.infNFe.children.find((c) => c.local === 'dest');
  const total = nfe.infNFe.children.find((c) => c.local === 'total');
  const extra = nfe.infNFe.children.filter((c) =>
    ['transp', 'cobr', 'pag', 'infAdic', 'infIntermed', 'exporta', 'compra', 'infRespTec'].includes(
      c.local,
    ),
  );
  const keyText = nfe.key?.normalized ?? nfe.id?.replace(/^NFe/, '') ?? '';

  return (
    <div className="st-stack">
      <div className="st-nfe-head">
        <h2 className="st-h2">
          {model} {s.nNF ? `nº ${s.nNF}` : ''}
          {s.serie ? ` · ${tr('série', 'series')} ${s.serie}` : ''}
        </h2>
        <div className="st-toolbar">
          {s.tpAmb === '2' && <Badge tone="warning">{tr('Homologação', 'Homologation')}</Badge>}
          {s.tpAmb === '1' && <Badge tone="neutral">{tr('Produção', 'Production')}</Badge>}
          {nfe.protocol?.cStat && (
            <Badge tone="neutral">
              cStat {nfe.protocol.cStat}
              {nfe.protocol.xMotivo ? ` · ${nfe.protocol.xMotivo}` : ''}
            </Badge>
          )}
        </div>
      </div>
      {keyText && (
        <ResultRow label={tr('Chave de acesso', 'Access key')} value={formatAccessKey(keyText)} />
      )}
      <IssueList issues={nfe.issues} />
      {nfe.key && !nfe.key.valid && (
        <Notice tone="danger" title={tr('Detalhes da chave', 'Key details')}>
          <KeyErrors nfe={nfe} />
        </Notice>
      )}

      <Tabs defaultValue="summary" variant="underline">
        <Tabs.List aria-label={tr('Seções da nota', 'Invoice sections')}>
          <Tabs.Tab value="summary">{tr('Resumo', 'Summary')}</Tabs.Tab>
          <Tabs.Tab value="items">
            {tr('Itens', 'Items')} ({nfe.items.length})
          </Tabs.Tab>
          <Tabs.Tab value="totals">{tr('Totais', 'Totals')}</Tabs.Tab>
          <Tabs.Tab value="more">{tr('Transporte e pagamento', 'Transport and payment')}</Tabs.Tab>
          <Tabs.Tab value="protocol">{tr('Protocolo', 'Protocol')}</Tabs.Tab>
          <Tabs.Tab value="xml">XML</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="summary">
          <div className="st-stack">
            <dl className="st-dl">
              <Row label={tr('Emissão', 'Issued at')}>{s.dhEmi ?? '—'}</Row>
              <Row label={tr('Natureza da operação', 'Nature of operation')}>{s.natOp ?? '—'}</Row>
              <Row label={tr('Valor da nota', 'Invoice total')}>{money(s.vNF) || '—'}</Row>
              <Row label={tr('Emitente', 'Issuer')}>
                {s.emitName ?? '—'} {s.emitDoc && <code>{s.emitDoc}</code>}
              </Row>
              <Row label={tr('Destinatário', 'Recipient')}>
                {s.destName ?? '—'} {s.destDoc && <code>{s.destDoc}</code>}
              </Row>
            </dl>
            {[ide, emit, dest].map(
              (g) =>
                g && (
                  <section key={g.local}>
                    <h3 className="st-h3">{fieldLabel(g.local, locale)}</h3>
                    <GroupView el={g} />
                  </section>
                ),
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="items">
          {nfe.items.length === 0 ? (
            <p className="st-hint">{tr('A nota não tem itens.', 'The invoice has no items.')}</p>
          ) : (
            <div className="st-stack">
              <div className="st-table-wrap">
                <table className="st-table">
                  <caption>{tr('Itens da nota', 'Invoice items')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{tr('Descrição', 'Description')}</th>
                      <th scope="col">NCM</th>
                      <th scope="col">CFOP</th>
                      <th scope="col">{tr('Qtd.', 'Qty')}</th>
                      <th scope="col">{tr('Valor', 'Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nfe.items.map((it) => (
                      <tr key={it.nItem}>
                        <td className="st-mono">{it.nItem}</td>
                        <td>
                          {it.xProd ?? '—'}
                          {it.cProd && <div className="st-muted st-mono">{it.cProd}</div>}
                        </td>
                        <td className="st-mono">{it.NCM ?? '—'}</td>
                        <td className="st-mono">{it.CFOP ?? '—'}</td>
                        <td className="st-mono">
                          {it.qCom ?? '—'} {it.uCom}
                        </td>
                        <td className="st-mono">{money(it.vProd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="st-h3">{tr('Detalhes por item', 'Details per item')}</h3>
              <Accordion type="multiple" headingLevel={4}>
                {nfe.items.map((it) => (
                  <Accordion.Item
                    key={it.nItem}
                    value={it.nItem}
                    title={`${tr('Item', 'Item')} ${it.nItem} · ${it.xProd ?? ''}`}
                  >
                    <div className="st-stack">
                      {it.prod && (
                        <section>
                          <h5 className="st-group__title">{fieldLabel('prod', locale)}</h5>
                          <GroupView el={it.prod} level={4} />
                        </section>
                      )}
                      {it.imposto && (
                        <section>
                          <h5 className="st-group__title">{fieldLabel('imposto', locale)}</h5>
                          <GroupView el={it.imposto} level={4} />
                        </section>
                      )}
                      {it.infAdProd && (
                        <p>
                          <strong>{tr('Informação adicional', 'Additional information')}:</strong>{' '}
                          {it.infAdProd}
                        </p>
                      )}
                    </div>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="totals">
          {total ? (
            <GroupView el={total} />
          ) : (
            <p className="st-hint">{tr('Sem grupo de totais.', 'No totals group.')}</p>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="more">
          {extra.length === 0 ? (
            <p className="st-hint">{tr('Nada informado.', 'Nothing informed.')}</p>
          ) : (
            <div className="st-stack">
              {extra.map((g) => (
                <section key={g.local}>
                  <h3 className="st-h3">{fieldLabel(g.local, locale)}</h3>
                  <GroupView el={g} />
                </section>
              ))}
              <p className="st-hint">
                {tr(
                  'A forma de pagamento (tPag) aparece só como código. A tabela de meios de pagamento muda por informe técnico e não está no XSD.',
                  'The payment method (tPag) is shown as a code only. The payment method table changes through technical bulletins and is not in the XSD.',
                )}
              </p>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="protocol">
          {nfe.protocol ? (
            <ProtocolBlock p={nfe.protocol} />
          ) : (
            <p className="st-hint">
              {tr(
                'Este XML não traz protocolo de autorização (protNFe).',
                'This XML has no authorization protocol (protNFe).',
              )}
            </p>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="xml">
          <div className="st-stack">
            <Toolbar>
              <Button
                variant="soft"
                leftIcon={<Download size={16} />}
                onClick={() => downloadBlob(xml, `${keyText || 'nfe'}.xml`, 'application/xml')}
              >
                {tr('Baixar XML original', 'Download original XML')}
              </Button>
            </Toolbar>
            <Output
              label={tr('XML formatado', 'Formatted XML')}
              value={formatted ?? xml}
              rows={16}
            />
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function KeyErrors({ nfe }: { nfe: NfeView }) {
  const { em } = useI18n();
  return (
    <ul className="st-issues">
      {nfe.key?.errors.map((e, i) => (
        <li key={i}>{em(e.message)}</li>
      ))}
    </ul>
  );
}

function DocumentView({ doc, run, xml }: { doc: FiscalDocument; run: NfeRun; xml: string }) {
  const { tr } = useI18n();
  const [selected, setSelected] = useState('0');
  const index = Math.min(Number(selected), Math.max(doc.nfes.length - 1, 0));
  const nfe = doc.nfes[index];
  const rootName: Record<FiscalDocument['root'], string> = {
    NFe: tr('NF-e sem protocolo', 'NF-e without protocol'),
    nfeProc: tr('NF-e com protocolo (nfeProc)', 'NF-e with protocol (nfeProc)'),
    enviNFe: tr('Lote de envio (enviNFe)', 'Submission batch (enviNFe)'),
    retEnviNFe: tr('Retorno do envio (retEnviNFe)', 'Submission response (retEnviNFe)'),
    protNFe: tr('Protocolo avulso (protNFe)', 'Standalone protocol (protNFe)'),
  };

  return (
    <div className="st-stack" role="region" aria-label={tr('Nota lida', 'Parsed invoice')}>
      <p className="st-status st-status--success" role="status">
        {tr('Documento lido', 'Document read')}: {rootName[doc.root]}
        {doc.version ? ` · ${tr('versão', 'version')} ${doc.version}` : ''}
      </p>
      <IssueList issues={doc.issues} />
      {doc.batch && (
        <dl className="st-dl">
          <Row label={tr('Lote', 'Batch')}>{doc.batch.idLote ?? '—'}</Row>
          <Row label={tr('Processamento síncrono', 'Synchronous')}>{doc.batch.indSinc ?? '—'}</Row>
          <Row label={tr('Notas no lote', 'Invoices in batch')}>{doc.nfes.length}</Row>
        </dl>
      )}
      {doc.response && (
        <dl className="st-dl">
          <Row label={tr('Status do lote', 'Batch status')}>
            {doc.response.cStat ?? '—'} {doc.response.xMotivo}
          </Row>
          {doc.response.tpAmb && (
            <Row label={tr('Ambiente', 'Environment')}>
              <CodeValue field="tpAmb" value={doc.response.tpAmb} />
            </Row>
          )}
          {doc.response.nRec && <Row label={tr('Recibo', 'Receipt')}>{doc.response.nRec}</Row>}
          {doc.response.dhRecbto && (
            <Row label={tr('Recebimento', 'Received at')}>{doc.response.dhRecbto}</Row>
          )}
        </dl>
      )}
      {doc.protocols.map((p, i) => (
        <section key={i}>
          <h2 className="st-h2">{tr('Protocolo', 'Protocol')}</h2>
          <ProtocolBlock p={p} />
        </section>
      ))}
      {doc.nfes.length > 1 && (
        <Select
          label={tr('Nota do lote', 'Invoice in batch')}
          value={String(index)}
          onValueChange={setSelected}
          options={doc.nfes.map((n, i) => ({
            value: String(i),
            label: `${i + 1}. ${n.summary.mod === '65' ? 'NFC-e' : 'NF-e'} ${n.summary.nNF ?? '?'} · ${n.summary.emitName ?? ''}`,
          }))}
        />
      )}
      {nfe && <NfeDetail key={index} nfe={nfe} formatted={run.formatted} xml={xml} />}
    </div>
  );
}

export default function NfeViewer() {
  const { t, tr, em } = useI18n();
  const [xml, setXml] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<unknown>(null);
  const [requested, setRequested] = useState<string | null>(null);
  const [run, setRun, clearRun] = useResultFor<NfeRun>([xml]);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = requested !== null && requested === xml && !run;

  useEffect(() => {
    if (requested === null || requested !== xml) return;
    const ctrl = new AbortController();
    parseNfeIsolated(xml, { signal: ctrl.signal }).then((r) => {
      if (r) setRun(r);
    });
    return () => ctrl.abort();
  }, [requested, xml, setRun]);

  const load = (text: string, name: string | null) => {
    setFileError(null);
    setXml(text);
    setFileName(name);
    setRequested(text);
  };

  const readFile = async (f: File) => {
    if (f.size > XML_MAX_INPUT) {
      setFileError(msg('nfe.fileTooLarge', { max: MAX_MB }));
      return;
    }
    load(await f.text(), f.name);
  };

  const clear = () => {
    setXml('');
    setFileName(null);
    setFileError(null);
    setRequested(null);
    clearRun();
    if (fileRef.current) fileRef.current.value = '';
  };

  const result = run?.result;

  return (
    <div className="st-stack">
      <Notice tone="info">
        {tr(
          'O XML é lido no seu navegador e não é enviado para lugar nenhum. A leitura mostra o que está no arquivo: não confere a assinatura digital, não valida contra o XSD e não consulta a SEFAZ.',
          'The XML is read in your browser and is not sent anywhere. It shows what is in the file: it does not check the digital signature, validate against the XSD or query SEFAZ.',
        )}
      </Notice>
      <TextArea
        label={tr('XML da NF-e ou NFC-e', 'NF-e or NFC-e XML')}
        value={xml}
        onChange={(e) => {
          setXml(e.target.value);
          setFileName(null);
        }}
        rows={6}
        placeholder='<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">…'
        spellCheck={false}
      />
      <div
        className="st-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) void readFile(f);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xml,application/xml,text/xml"
          className="st-sr-only"
          id="nfe-file"
          aria-label={tr('Arquivo XML', 'XML file')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void readFile(f);
          }}
        />
        <Button
          variant="soft"
          leftIcon={<Upload size={16} />}
          onClick={() => fileRef.current?.click()}
        >
          {tr('Escolher arquivo XML', 'Choose XML file')}
        </Button>
        <p className="st-hint">
          {fileName ??
            tr(
              `Ou arraste o arquivo aqui (até ${MAX_MB} MB). Ele não sai do seu computador.`,
              `Or drop the file here (up to ${MAX_MB} MB). It never leaves your computer.`,
            )}
        </p>
      </div>
      <Toolbar>
        <Button onClick={() => setRequested(xml)} disabled={!xml.trim() || busy}>
          {tr('Visualizar', 'View')}
        </Button>
        {/* Nota fictícia gerada na hora, em homologação. */}
        <Button
          variant="ghost"
          onClick={() => load(buildSampleNfe({ withProtocol: true }).xml, null)}
        >
          {t('action.example')}
        </Button>
        <Button variant="ghost" leftIcon={<X size={16} />} onClick={clear}>
          {t('action.clear')}
        </Button>
      </Toolbar>

      {fileError !== null && <Notice tone="danger">{em(fileError)}</Notice>}
      {busy && (
        <p className="st-hint" role="status">
          <Spinner size="sm" /> {tr('Lendo o XML…', 'Reading the XML…')}
        </p>
      )}
      {result && !result.ok && (
        <Notice tone="danger" title={tr('Não foi possível ler o XML', 'Could not read the XML')}>
          {result.error.line
            ? `${tr('Linha', 'Line')} ${result.error.line}, ${tr('coluna', 'column')} ${result.error.column}: `
            : ''}
          {em(result.error.message)}
        </Notice>
      )}
      {result?.ok && run && <DocumentView doc={result} run={run} xml={xml} />}

      <ToolHelp>
        <p>
          {tr(
            'Aceita NFe, nfeProc (nota com protocolo), enviNFe (lote), retEnviNFe (retorno do envio) e protNFe, no layout 4.00 com os grupos de IBS, CBS e Imposto Seletivo. Campos ausentes são normais e não aparecem.',
            'Accepts NFe, nfeProc (invoice with protocol), enviNFe (batch), retEnviNFe (submission response) and protNFe, layout 4.00 including the IBS, CBS and Selective Tax groups. Missing fields are normal and are not shown.',
          )}
        </p>
        <p>
          {tr(
            'A chave de acesso do atributo Id é validada e comparada com cUF, ano e mês de emissão, CNPJ ou CPF do emitente, modelo, série, número, forma de emissão, código numérico e dígito verificador. A chave do protocolo também é comparada com a da nota.',
            'The access key in the Id attribute is validated and compared with cUF, issue year and month, issuer CNPJ or CPF, model, series, number, issue type, numeric code and check digit. The protocol key is also compared with the invoice key.',
          )}
        </p>
        <p>
          {tr(
            'Rótulos e descrições de códigos vêm da documentação do schema oficial (leiauteNFe_v4.00.xsd, pacote PL_010h). Valores aparecem como estão no XML, sem recálculo de tributos.',
            'Labels and code descriptions come from the official schema documentation (leiauteNFe_v4.00.xsd, package PL_010h). Values appear as they are in the XML, without recalculating taxes.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
