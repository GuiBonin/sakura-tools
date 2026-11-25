import { Badge, Button, Input, Switch } from '@guibonin/sakura-ui';
import type { DocumentValidation } from '@sakura-tools/tools/brazil';
import { useMemo, useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Notice, Output, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export interface DocumentValidatorProps {
  docName: 'CPF' | 'CNPJ';
  placeholder: string;
  validate: (v: string) => DocumentValidation & { alphanumeric?: boolean };
  generate: (alphanumeric: boolean) => string;
  format: (v: string) => string;
  supportsAlphanumeric?: boolean;
  help: { pt: string; en: string };
}

/** Base comum dos validadores de CPF e CNPJ. */
export function DocumentValidator({
  docName,
  placeholder,
  validate,
  generate,
  format,
  supportsAlphanumeric,
  help,
}: DocumentValidatorProps) {
  const { t, tr } = useI18n();
  const [value, setValue] = useState('');
  const [count, setCount] = useState(5);
  const [alnum, setAlnum] = useState(false);
  const [masked, setMasked] = useState(true);
  const [generated, setGenerated] = useState('');
  const result = useMemo(() => (value.trim() ? validate(value) : null), [value, validate]);

  return (
    <div className="st-stack">
      <Notice tone="info">
        {tr(
          `Validar os dígitos verificadores não comprova que o ${docName} existe nem a situação cadastral. Só mostra que o número é matematicamente coerente.`,
          `Validating check digits does not prove the ${docName} exists or its registration status. It only shows the number is mathematically consistent.`,
        )}
      </Notice>
      <Input
        label={docName}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="st-mono"
        autoComplete="off"
      />
      <Toolbar>
        {/* O exemplo é um número fictício gerado na hora, nunca um documento real. */}
        <Button variant="ghost" onClick={() => setValue(format(generate(false)))}>
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setValue('');
            setGenerated('');
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>
      {result && (
        <p
          className={`st-status ${result.valid ? 'st-status--success' : 'st-status--danger'}`}
          role="status"
        >
          {result.valid ? (
            <>
              {tr('Dígitos verificadores corretos', 'Check digits are correct')}:{' '}
              <code>{result.formatted}</code>
              {'alphanumeric' in result && result.alphanumeric && (
                <>
                  {' '}
                  <Badge tone="accent" size="sm">
                    {tr('Alfanumérico', 'Alphanumeric')}
                  </Badge>
                </>
              )}
            </>
          ) : (
            result.reason
          )}
        </p>
      )}

      <h2 className="st-h2">{tr(`Gerar ${docName} para testes`, `Generate test ${docName}`)}</h2>
      <Notice tone="warning">
        {tr(
          'Números fictícios para testar sistemas. Não use para identificar pessoas ou empresas, nem para fraude.',
          'Fake numbers for testing software. Do not use them to identify people or companies, or for fraud.',
        )}
      </Notice>
      <Toolbar>
        <Input
          label={tr('Quantidade', 'Amount')}
          type="number"
          min={1}
          max={100}
          size="sm"
          value={String(count)}
          onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
          wrapperClassName="st-input-narrow"
        />
        <Switch
          label={tr('Com máscara', 'Formatted')}
          checked={masked}
          onCheckedChange={setMasked}
        />
        {supportsAlphanumeric && (
          <Switch
            label={tr('Alfanumérico', 'Alphanumeric')}
            checked={alnum}
            onCheckedChange={setAlnum}
          />
        )}
        <Button
          onClick={() =>
            setGenerated(
              Array.from({ length: count }, () => {
                const v = generate(alnum);
                return masked ? format(v) : v;
              }).join('\n'),
            )
          }
        >
          {t('action.generate')}
        </Button>
      </Toolbar>
      {generated && (
        <Output
          label={tr('Gerados (dados de teste)', 'Generated (test data)')}
          value={generated}
          rows={Math.min(10, count + 1)}
        />
      )}
      <ToolHelp>
        <p>{tr(help.pt, help.en)}</p>
      </ToolHelp>
    </div>
  );
}
