import { Badge, Button, Switch } from '@guibonin/sakura-ui';
import {
  compareXml,
  type CompareFailure,
  type CompareResult,
  type DiffKind,
} from '@sakura-tools/fiscal/compare';
import { buildSampleNfe } from '@sakura-tools/fiscal/sample';
import { msg } from '@sakura-tools/tools/messages';
import { XML_MAX_INPUT } from '@sakura-tools/tools/xml';
import { Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Notice, Segmented, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useResultFor } from '../lib/useResultFor';

type Filter = 'all' | DiffKind;
const PAGE = 300;

function Side({
  label,
  value,
  onChange,
  onError,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onError: (e: unknown) => void;
}) {
  const { tr } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <div className="st-stack">
      <TextArea
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        spellCheck={false}
      />
      <input
        ref={ref}
        id={id}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="st-sr-only"
        aria-label={tr(`Arquivo para ${label}`, `File for ${label}`)}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > XML_MAX_INPUT) {
            onError(msg('nfe.fileTooLarge', { max: XML_MAX_INPUT / 1024 / 1024 }));
            return;
          }
          onError(null);
          onChange(await f.text());
        }}
      />
      <div>
        <Button
          variant="soft"
          size="sm"
          leftIcon={<Upload size={16} />}
          onClick={() => ref.current?.click()}
        >
          {tr('Abrir arquivo', 'Open file')}
        </Button>
      </div>
    </div>
  );
}

export default function NfeCompare() {
  const { t, tr, em } = useI18n();
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [ignoreSig, setIgnoreSig] = useState(true);
  const [fileError, setFileError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [result, setResult, clearResult] = useResultFor<CompareResult | CompareFailure>([
    left,
    right,
    ignoreSig,
  ]);

  const run = () => {
    setFilter('all');
    setLimit(PAGE);
    setResult(compareXml(left, right, { ignoreSignature: ignoreSig }));
  };

  // O Exemplo troca as duas entradas e compara depois que elas estão no estado,
  // para o resultado ficar ligado à entrada certa (useResultFor).
  const pendingRun = useRef(false);
  useEffect(() => {
    if (!pendingRun.current) return;
    pendingRun.current = false;
    setResult(compareXml(left, right, { ignoreSignature: ignoreSig }));
  }, [left, right, ignoreSig, setResult]);

  const kindLabel: Record<DiffKind, string> = {
    changed: tr('Alterado', 'Changed'),
    onlyLeft: tr('Só no A', 'Only in A'),
    onlyRight: tr('Só no B', 'Only in B'),
  };
  const diffs = result?.ok ? result.diffs : [];
  const filtered = filter === 'all' ? diffs : diffs.filter((d) => d.kind === filter);
  const count = (k: DiffKind) => diffs.filter((d) => d.kind === k).length;

  return (
    <div className="st-stack">
      <Notice tone="info">
        {tr(
          'Compara dois XML campo a campo, no seu navegador. Feito para NF-e e NFC-e, mas funciona com qualquer XML bem formado.',
          'Compares two XML files field by field, in your browser. Built for NF-e and NFC-e, but works with any well-formed XML.',
        )}
      </Notice>
      <div className="st-compare">
        <Side label={tr('XML A', 'XML A')} value={left} onChange={setLeft} onError={setFileError} />
        <Side
          label={tr('XML B', 'XML B')}
          value={right}
          onChange={setRight}
          onError={setFileError}
        />
      </div>
      <Switch
        label={tr(
          'Ignorar a assinatura digital (Signature)',
          'Ignore the digital signature (Signature)',
        )}
        checked={ignoreSig}
        onCheckedChange={setIgnoreSig}
      />
      <Toolbar>
        <Button onClick={() => run()} disabled={!left.trim() || !right.trim()}>
          {tr('Comparar', 'Compare')}
        </Button>
        {/* Duas notas fictícias do mesmo emitente com diferenças de propósito. */}
        <Button
          variant="ghost"
          onClick={() => {
            const date = new Date();
            const a = buildSampleNfe({ date, nNF: 1234, cNF: '48271934' });
            const emit = /<CNPJ>(\w+)<\/CNPJ>/.exec(a.xml)?.[1];
            const b = buildSampleNfe({ date, nNF: 1234, cNF: '48271934', emitCnpj: emit })
              .xml.replace('<vNF>150.00</vNF>', '<vNF>155.00</vNF>')
              .replace('<vFrete>0.00</vFrete>', '<vFrete>5.00</vFrete>')
              .replace('<modFrete>9</modFrete>', '<modFrete>0</modFrete>');
            const destA = /<CPF>(\d+)<\/CPF>/.exec(a.xml)?.[1] ?? '';
            const fixed = b.replace(/<CPF>\d+<\/CPF>/, `<CPF>${destA}</CPF>`);
            setLeft(a.xml);
            setRight(fixed);
            pendingRun.current = true;
          }}
        >
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setLeft('');
            setRight('');
            setFileError(null);
            clearResult();
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>

      {fileError !== null && <Notice tone="danger">{em(fileError)}</Notice>}
      {result && !result.ok && (
        <Notice tone="danger" title={tr('Não foi possível ler o XML', 'Could not read the XML')}>
          {result.side === 'left' ? 'XML A' : 'XML B'}
          {result.error.line
            ? ` · ${tr('linha', 'line')} ${result.error.line}, ${tr('coluna', 'column')} ${result.error.column}`
            : ''}
          : {em(result.error.message)}
        </Notice>
      )}
      {result?.ok && (
        <div className="st-stack" role="region" aria-label={tr('Diferenças', 'Differences')}>
          <p
            className={`st-status ${diffs.length === 0 ? 'st-status--success' : ''}`}
            role="status"
          >
            {diffs.length === 0
              ? tr(
                  `Nenhuma diferença em ${result.compared} valores comparados.`,
                  `No differences in ${result.compared} compared values.`,
                )
              : tr(
                  `${diffs.length} diferença(s) em ${result.compared} valores: ${count('changed')} alterada(s), ${count('onlyLeft')} só no A, ${count('onlyRight')} só no B.`,
                  `${diffs.length} difference(s) in ${result.compared} values: ${count('changed')} changed, ${count('onlyLeft')} only in A, ${count('onlyRight')} only in B.`,
                )}
          </p>
          {diffs.length > 0 && (
            <>
              <Segmented<Filter>
                label={tr('Mostrar', 'Show')}
                value={filter}
                onChange={(v) => {
                  setFilter(v);
                  setLimit(PAGE);
                }}
                options={[
                  { value: 'all', label: tr('Todas', 'All') },
                  { value: 'changed', label: kindLabel.changed },
                  { value: 'onlyLeft', label: kindLabel.onlyLeft },
                  { value: 'onlyRight', label: kindLabel.onlyRight },
                ]}
              />
              <div className="st-table-wrap">
                <table className="st-table">
                  <caption>{tr('Diferenças encontradas', 'Differences found')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{tr('Caminho', 'Path')}</th>
                      <th scope="col">{tr('Tipo', 'Type')}</th>
                      <th scope="col">XML A</th>
                      <th scope="col">XML B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, limit).map((d) => (
                      <tr key={d.path}>
                        <th scope="row" className="st-mono">
                          {d.path}
                        </th>
                        <td>
                          <Badge
                            tone={
                              d.kind === 'changed'
                                ? 'warning'
                                : d.kind === 'onlyLeft'
                                  ? 'danger'
                                  : 'success'
                            }
                            size="sm"
                          >
                            {kindLabel[d.kind]}
                          </Badge>
                        </td>
                        <td className="st-mono">{d.left ?? '—'}</td>
                        <td className="st-mono">{d.right ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > limit && (
                <Button variant="soft" onClick={() => setLimit((n) => n + PAGE)}>
                  {tr(
                    `Mostrar mais (${filtered.length - limit} restantes)`,
                    `Show more (${filtered.length - limit} remaining)`,
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <ToolHelp>
        <p>
          {tr(
            'Cada valor vira um caminho, como NFe/infNFe/det[2]/prod/vProd. Itens repetidos ganham índice pela ordem no documento, e atributos aparecem com @, como infNFe/@Id. Se um item for inserido no meio, os seguintes aparecem como alterados, porque a comparação é por posição.',
            'Each value becomes a path, like NFe/infNFe/det[2]/prod/vProd. Repeated items get an index by document order, and attributes show with @, like infNFe/@Id. If an item is inserted in the middle, the following ones show as changed, because comparison is by position.',
          )}
        </p>
        <p>
          {tr(
            'A assinatura digital muda a cada emissão, por isso fica de fora por padrão. Valores são comparados como texto: 10.00 e 10.0 são diferentes.',
            'The digital signature changes on every issue, so it is ignored by default. Values are compared as text: 10.00 and 10.0 are different.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
