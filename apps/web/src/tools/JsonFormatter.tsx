import { Button, Select } from '@guibonin/sakura-ui';
import { formatJson, minifyJson, type JsonResult } from '@sakura-tools/tools/json';
import { useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Output, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useResultFor } from '../lib/useResultFor';

const EXAMPLE =
  '{"nome":"Sakura Tools","versao":1,"ferramentas":["json","xml"],"local":true,"dono":null}';

export default function JsonFormatter() {
  const { t, tr } = useI18n();
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState('2');
  // Editar o JSON ou trocar a indentação esconde o resultado (e o erro) anterior.
  const [stored, setResult, clearResult] = useResultFor<JsonResult>([input, indent]);
  const result = stored ?? null;

  const run = (mode: 'format' | 'minify' | 'sort') => {
    const ind = indent === 'tab' ? '\t' : Number(indent);
    setResult(mode === 'minify' ? minifyJson(input) : formatJson(input, ind, mode === 'sort'));
  };

  const error = result && !result.ok ? result.error : null;
  const errorText = error
    ? `${error.line ? tr(`Linha ${error.line}, coluna ${error.column}: `, `Line ${error.line}, column ${error.column}: `) : ''}${error.message}`
    : undefined;

  return (
    <div className="st-stack">
      <TextArea
        label={tr('JSON de entrada', 'Input JSON')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        error={errorText}
        placeholder='{"chave": "valor"}'
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run('format');
        }}
      />
      <Toolbar>
        <Button onClick={() => run('format')} disabled={!input.trim()}>
          {tr('Formatar', 'Format')}
        </Button>
        <Button variant="soft" onClick={() => run('minify')} disabled={!input.trim()}>
          {tr('Minificar', 'Minify')}
        </Button>
        <Button variant="soft" onClick={() => run('sort')} disabled={!input.trim()}>
          {tr('Ordenar chaves', 'Sort keys')}
        </Button>
        <Select
          aria-label={tr('Indentação', 'Indentation')}
          size="sm"
          value={indent}
          onValueChange={setIndent}
          options={[
            { value: '2', label: tr('2 espaços', '2 spaces') },
            { value: '4', label: tr('4 espaços', '4 spaces') },
            { value: 'tab', label: 'Tab' },
          ]}
        />
        <Button variant="ghost" onClick={() => setInput(EXAMPLE)}>
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setInput('');
            clearResult();
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>
      {result?.ok && (
        <>
          <p className="st-status st-status--success" role="status">
            {tr('JSON válido.', 'Valid JSON.')}
          </p>
          <Output label={tr('Resultado', 'Result')} value={result.output} rows={14} />
        </>
      )}
      <ToolHelp>
        <p>
          {tr(
            'Atalho: Ctrl+Enter formata. O conteúdo é processado só no seu navegador e não é salvo.',
            'Shortcut: Ctrl+Enter formats. Content is processed only in your browser and is not saved.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
