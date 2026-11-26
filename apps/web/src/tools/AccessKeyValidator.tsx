import { Badge, Button, Input } from '@guibonin/sakura-ui';
import {
  ACCESS_KEY_LAYOUT,
  generateAccessKey,
  TP_EMIS,
  validateAccessKey,
  type AccessKeyField,
  type AccessKeyIssue,
  type AccessKeyParts,
} from '@sakura-tools/tools/accessKey';
import { useMemo, useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Notice, ResultRow, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

type Tr = (pt: string, en: string) => string;

function fieldName(field: AccessKeyField, tr: Tr): string {
  switch (field) {
    case 'cUF':
      return tr('UF (cUF)', 'State (cUF)');
    case 'AAMM':
      return tr('Ano e mês (AAMM)', 'Year and month (AAMM)');
    case 'emitter':
      return tr('CNPJ ou CPF do emitente', 'Issuer CNPJ or CPF');
    case 'mod':
      return tr('Modelo (mod)', 'Model (mod)');
    case 'serie':
      return tr('Série', 'Series');
    case 'nNF':
      return tr('Número (nNF)', 'Number (nNF)');
    case 'tpEmis':
      return tr('Forma de emissão (tpEmis)', 'Issue type (tpEmis)');
    case 'cNF':
      return tr('Código numérico (cNF)', 'Numeric code (cNF)');
    case 'cDV':
      return tr('Dígito verificador (cDV)', 'Check digit (cDV)');
  }
}

function tpEmisName(code: string, tr: Tr): string {
  const name = TP_EMIS[code];
  if (!name) return '';
  if (code === '1') return tr('Emissão normal', 'Normal issue');
  if (code === '9') return tr('Contingência off-line da NFC-e', 'NFC-e offline contingency');
  return tr(`Contingência ${name}`, `${name} contingency`);
}

function fieldValue(field: AccessKeyField, p: AccessKeyParts): string {
  switch (field) {
    case 'cUF':
      return p.cUF;
    case 'AAMM':
      return p.aamm;
    case 'emitter':
      return p.emitter;
    case 'mod':
      return p.mod;
    case 'serie':
      return p.serie;
    case 'nNF':
      return p.nNF;
    case 'tpEmis':
      return p.tpEmis;
    case 'cNF':
      return p.cNF;
    case 'cDV':
      return p.cDV;
  }
}

function fieldMeaning(field: AccessKeyField, p: AccessKeyParts, tr: Tr): string {
  switch (field) {
    case 'cUF':
      return p.uf ?? '';
    case 'AAMM':
      return p.month >= 1 && p.month <= 12 ? `${String(p.month).padStart(2, '0')}/${p.year}` : '';
    case 'emitter':
      if (!p.emitterFormatted) return '';
      return `${p.emitterType === 'cpf' ? 'CPF' : 'CNPJ'} ${p.emitterFormatted}`;
    case 'mod':
      return p.modelName ?? '';
    case 'serie':
      return String(Number(p.serie));
    case 'nNF':
      return String(Number(p.nNF));
    case 'tpEmis':
      return tpEmisName(p.tpEmis, tr);
    case 'cNF':
    case 'cDV':
      return '';
  }
}

export default function AccessKeyValidator() {
  const { t, tr, em } = useI18n();
  const [value, setValue] = useState('');
  const result = useMemo(() => (value.trim() ? validateAccessKey(value) : null), [value]);

  const issueText = (i: AccessKeyIssue) =>
    i.field ? `${fieldName(i.field, tr)}: ${em(i.message)}` : em(i.message);
  const fieldHasError = (f: AccessKeyField) => result?.errors.some((e) => e.field === f) ?? false;

  return (
    <div className="st-stack">
      <Notice tone="info">
        {tr(
          'Conferir a chave não comprova que a nota existe nem que foi autorizada pela SEFAZ. Só mostra que a chave segue a lei de formação. Nada sai do seu navegador.',
          'Checking the key does not prove the invoice exists or was authorized by SEFAZ. It only shows the key follows the official format. Nothing leaves your browser.',
        )}
      </Notice>
      <Input
        label={tr('Chave de acesso', 'Access key')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
        className="st-mono"
        autoComplete="off"
        spellCheck={false}
      />
      <Toolbar>
        {/* O exemplo é uma chave fictícia gerada na hora, nunca de uma nota real. */}
        <Button variant="ghost" onClick={() => setValue(generateAccessKey())}>
          {t('action.example')}
        </Button>
        <Button variant="ghost" onClick={() => setValue('')}>
          {t('action.clear')}
        </Button>
      </Toolbar>

      {result && (
        <div
          className={`st-status ${result.valid ? 'st-status--success' : 'st-status--danger'}`}
          role="status"
        >
          {result.valid ? (
            <>
              {tr('Chave de acesso coerente', 'Access key is consistent')}
              {result.parts?.modelName && (
                <>
                  {' '}
                  <Badge tone="accent" size="sm">
                    {result.parts.modelName}
                  </Badge>
                </>
              )}
              {result.parts?.alphanumeric && (
                <>
                  {' '}
                  <Badge tone="accent" size="sm">
                    {tr('CNPJ alfanumérico', 'Alphanumeric CNPJ')}
                  </Badge>
                </>
              )}
            </>
          ) : (
            <>
              {result.errors.length === 1
                ? tr('1 problema na chave:', '1 problem in the key:')
                : tr(
                    `${result.errors.length} problemas na chave:`,
                    `${result.errors.length} problems in the key:`,
                  )}
              <ul className="st-issues">
                {result.errors.map((e, i) => (
                  <li key={i}>{issueText(e)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {result && result.warnings.length > 0 && (
        <Notice tone="warning" title={tr('Atenção', 'Heads up')}>
          <ul className="st-issues">
            {result.warnings.map((w, i) => (
              <li key={i}>{issueText(w)}</li>
            ))}
          </ul>
        </Notice>
      )}

      {result?.parts && (
        <>
          <ResultRow label={tr('Chave formatada', 'Formatted key')} value={result.formatted} />
          <div className="st-table-wrap">
            <table className="st-table">
              <caption>{tr('Campos da chave', 'Key fields')}</caption>
              <thead>
                <tr>
                  <th scope="col">{tr('Campo', 'Field')}</th>
                  <th scope="col">{tr('Posição', 'Position')}</th>
                  <th scope="col">{tr('Valor', 'Value')}</th>
                  <th scope="col">{tr('Significado', 'Meaning')}</th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_KEY_LAYOUT.map(({ field, start, size }) => (
                  <tr key={field} className={fieldHasError(field) ? 'st-row--danger' : undefined}>
                    <th scope="row">{fieldName(field, tr)}</th>
                    <td className="st-mono">
                      {size === 1 ? start : `${start}–${start + size - 1}`}
                    </td>
                    <td className="st-mono">{fieldValue(field, result.parts!)}</td>
                    <td>
                      {fieldMeaning(field, result.parts!, tr)}
                      {field === 'cDV' && result.expectedDv !== result.parts!.cDV && (
                        <>
                          {tr('Esperado', 'Expected')} <code>{result.expectedDv}</code>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ToolHelp>
        <p>
          {tr(
            'A chave tem 44 posições: UF, ano e mês, CNPJ ou CPF do emitente, modelo, série, número, forma de emissão, código numérico e dígito verificador. O dígito é calculado por módulo 11 sobre o valor ASCII de cada caractere menos 48, como manda a NT 2025.001 (CNPJ alfanumérico). Para chaves só com números, o resultado é o mesmo do cálculo antigo.',
            'The key has 44 positions: state, year and month, issuer CNPJ or CPF, model, series, number, issue type, numeric code and check digit. The check digit is modulo 11 over each character ASCII value minus 48, as required by NT 2025.001 (alphanumeric CNPJ). For digit-only keys the result matches the old calculation.',
          )}
        </p>
        <p>
          {tr(
            'O código numérico segue a regra B03-10 da NT 2019.001 (Rejeição 897): não pode ser uma das sequências fracas da lista nem igual ao número da nota. Não dá para conferir aqui se o AAMM bate com a data de emissão do XML nem se a nota está autorizada.',
            'The numeric code follows rule B03-10 of NT 2019.001 (Rejection 897): it cannot be one of the listed weak sequences or equal the invoice number. This tool cannot check whether AAMM matches the XML issue date or whether the invoice is authorized.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
