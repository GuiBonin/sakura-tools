import { Button, Checkbox } from '@guibonin/sakura-ui';
import { diffTexts, diffToText, type DiffMode, type DiffSummary } from '@sakura-tools/tools/diff';
import { useState } from 'react';
import { CopyButton, Segmented, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useResultFor } from '../lib/useResultFor';

export default function TextDiff() {
  const { t, tr, em } = useI18n();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [mode, setMode] = useState<DiffMode>('lines');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWs, setIgnoreWs] = useState(false);
  // Mudar texto, modo ou opção esconde o diff anterior até comparar de novo.
  const [outcome, setOutcome, clearOutcome] = useResultFor<{
    result?: DiffSummary;
    error?: unknown;
  }>([a, b, mode, ignoreCase, ignoreWs]);
  const result = outcome?.result ?? null;
  const error = outcome?.error;

  const run = () => {
    try {
      setOutcome({ result: diffTexts(a, b, mode, { ignoreCase, ignoreWhitespace: ignoreWs }) });
    } catch (e) {
      setOutcome({ error: e });
    }
  };

  const unit = mode === 'lines' ? tr('linhas', 'lines') : tr('caracteres', 'characters');

  return (
    <div className="st-stack">
      <div className="st-grid-2">
        <TextArea
          label={tr('Texto original', 'Original text')}
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <TextArea
          label={tr('Texto alterado', 'Changed text')}
          value={b}
          onChange={(e) => setB(e.target.value)}
          error={em(error)}
        />
      </div>
      <Toolbar>
        <Segmented
          label={tr('Comparar por', 'Compare by')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'lines', label: tr('Linhas', 'Lines') },
            { value: 'words', label: tr('Palavras', 'Words') },
            { value: 'chars', label: tr('Caracteres', 'Characters') },
          ]}
        />
        <Checkbox
          label={tr('Ignorar maiúsculas', 'Ignore case')}
          checked={ignoreCase}
          onCheckedChange={setIgnoreCase}
        />
        {mode === 'lines' && (
          <Checkbox
            label={tr('Ignorar espaços', 'Ignore whitespace')}
            checked={ignoreWs}
            onCheckedChange={setIgnoreWs}
          />
        )}
      </Toolbar>
      <Toolbar>
        <Button onClick={run}>{tr('Comparar', 'Compare')}</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setA('Cliente: Maria\nValor: 100,00\nStatus: pendente\n');
            setB('Cliente: Maria\nValor: 120,00\nStatus: pendente\nObs: reajuste\n');
          }}
        >
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setA('');
            setB('');
            clearOutcome();
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>
      {result && (
        <>
          <p className="st-status" role="status">
            {result.identical
              ? tr('Os textos são iguais.', 'The texts are identical.')
              : `+${result.added} / −${result.removed} ${mode === 'words' ? tr('caracteres', 'characters') : unit}`}
          </p>
          {!result.identical && (
            <Toolbar>
              <CopyButton
                value={diffToText(result.parts, mode)}
                label={tr('Copiar diff', 'Copy diff')}
              />
              <span className="st-hint">
                {mode === 'lines'
                  ? tr(
                      'Copia com "+" e "-" no início de cada linha.',
                      'Copies with "+" and "-" at the start of each line.',
                    )
                  : tr(
                      'Copia no formato [-removido-]{+adicionado+}.',
                      'Copies as [-removed-]{+added+}.',
                    )}
              </span>
            </Toolbar>
          )}
          {!result.identical && (
            <pre className="st-pre st-diff" aria-label={tr('Diferenças', 'Differences')}>
              {result.parts.map((p, i) =>
                p.kind === 'added' ? (
                  <ins key={i}>{p.value}</ins>
                ) : p.kind === 'removed' ? (
                  <del key={i}>{p.value}</del>
                ) : (
                  <span key={i}>{p.value}</span>
                ),
              )}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
