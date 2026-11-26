import { Badge, Button, Input } from '@guibonin/sakura-ui';
import { CSTAT_SOURCE, searchCStat, type CStatKind } from '@sakura-tools/fiscal/rejections';
import { useMemo, useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Notice, Segmented, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

type Filter = 'all' | CStatKind;
const PAGE = 100;

function KindBadge({ kind }: { kind: CStatKind }) {
  const { tr } = useI18n();
  if (kind === 'rejection') return <Badge tone="danger">{tr('Rejeição', 'Rejection')}</Badge>;
  if (kind === 'denial') return <Badge tone="warning">{tr('Denegação', 'Denial')}</Badge>;
  return <Badge tone="success">{tr('Resultado', 'Result')}</Badge>;
}

export default function RejectionCodes() {
  const { t, tr } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const results = useMemo(
    () => searchCStat(query, filter === 'all' ? undefined : [filter]),
    [query, filter],
  );
  const shown = results.slice(0, limit);

  return (
    <div className="st-stack">
      <Notice tone="info">
        {tr(
          `Tabela oficial do ${CSTAT_SOURCE.document}, versão ${CSTAT_SOURCE.version} (outubro de 2020), baixada do Portal Nacional da NF-e. Códigos criados por notas técnicas depois disso não estão aqui. A consulta é local.`,
          `Official table from the ${CSTAT_SOURCE.document} (MOC 7.0, Annex I), version ${CSTAT_SOURCE.version} (October 2020), downloaded from the national NF-e portal. Codes created by technical notes after that are not included. Lookup is local.`,
        )}
      </Notice>
      <Input
        label={tr('Código ou texto', 'Code or text')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
        placeholder={tr('Ex.: 539 ou duplicidade', 'E.g. 539 or duplicidade')}
        autoComplete="off"
      />
      <Segmented<Filter>
        label={tr('Tipo', 'Type')}
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setLimit(PAGE);
        }}
        options={[
          { value: 'all', label: tr('Todos', 'All') },
          { value: 'rejection', label: tr('Rejeição', 'Rejection') },
          { value: 'denial', label: tr('Denegação', 'Denial') },
          { value: 'result', label: tr('Resultado', 'Result') },
        ]}
      />
      <Toolbar>
        <Button variant="ghost" onClick={() => setQuery('539')}>
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery('');
            setFilter('all');
            setLimit(PAGE);
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>

      <p className="st-hint" role="status">
        {results.length === 0
          ? tr('Nenhum código encontrado.', 'No code found.')
          : results.length === 1
            ? tr('1 código encontrado.', '1 code found.')
            : tr(`${results.length} códigos encontrados.`, `${results.length} codes found.`)}
      </p>

      {shown.length > 0 && (
        <div className="st-table-wrap">
          <table className="st-table">
            <caption>{tr('Códigos de status (cStat)', 'Status codes (cStat)')}</caption>
            <thead>
              <tr>
                <th scope="col">cStat</th>
                <th scope="col">{tr('Tipo', 'Type')}</th>
                <th scope="col">{tr('Texto oficial', 'Official text')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e, i) => (
                <tr key={`${e.code}-${e.kind}-${i}`}>
                  <th scope="row" className="st-mono">
                    {e.code}
                  </th>
                  <td>
                    <KindBadge kind={e.kind} />
                  </td>
                  <td>{e.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {results.length > shown.length && (
        <Button variant="soft" onClick={() => setLimit((n) => n + PAGE)}>
          {tr(
            `Mostrar mais (${results.length - shown.length} restantes)`,
            `Show more (${results.length - shown.length} remaining)`,
          )}
        </Button>
      )}

      <ToolHelp>
        <p>
          {tr(
            'Digite um número para buscar pelo começo do código (20 acha 201 a 209) ou palavras do texto. A busca ignora acento, maiúscula, hífen e ponto, e cada palavra precisa aparecer no texto.',
            'Type a number to search by code prefix (20 finds 201 to 209) or words from the text. Search ignores accents, case, hyphens and dots, and every word must appear in the text.',
          )}
        </p>
        <p>
          {tr(
            'Os textos estão como no documento oficial, em português, inclusive os marcadores como [nRec:999999999999999] que a SEFAZ preenche na resposta. Alguns códigos aparecem mais de uma vez com textos diferentes, como no documento.',
            'Texts are as in the official document, in Portuguese, including placeholders like [nRec:999999999999999] that SEFAZ fills in the response. Some codes appear more than once with different texts, as in the document.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
