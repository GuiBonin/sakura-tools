import { Button, Switch } from '@guibonin/sakura-ui';
import { decodeUrl, encodeUrl, parseUrl, type UrlMode } from '@sakura-tools/tools/url';
import { useMemo, useState } from 'react';
import { Output, Segmented, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useResultFor } from '../lib/useResultFor';

export default function UrlEncoder() {
  const { t, tr } = useI18n();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<UrlMode>('component');
  const [plus, setPlus] = useState(false);
  // Editar a entrada ou trocar modo/opção esconde o resultado anterior.
  const [outcome, setOutcome, clearOutcome] = useResultFor<{ output?: string; error?: string }>([
    input,
    mode,
    plus,
  ]);
  const output = outcome?.output ?? '';
  const error = outcome?.error;
  const parsed = useMemo(() => parseUrl(input.trim()), [input]);

  const run = (op: 'encode' | 'decode') => {
    try {
      setOutcome({
        output: op === 'encode' ? encodeUrl(input, mode) : decodeUrl(input, mode, plus),
      });
    } catch (e) {
      setOutcome({ error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="st-stack">
      <TextArea
        label={tr('Entrada', 'Input')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        error={error}
        rows={6}
      />
      <Toolbar>
        <Segmented
          label={tr('Modo', 'Mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'component', label: tr('Parâmetro', 'Component') },
            { value: 'full', label: tr('URL completa', 'Full URL') },
          ]}
        />
        <Switch
          label={tr('"+" é espaço', '"+" means space')}
          checked={plus}
          onCheckedChange={setPlus}
        />
      </Toolbar>
      <Toolbar>
        <Button onClick={() => run('encode')}>{tr('Codificar', 'Encode')}</Button>
        <Button variant="soft" onClick={() => run('decode')}>
          {tr('Decodificar', 'Decode')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setInput('https://exemplo.com/busca?q=ação e reação&página=2')}
        >
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setInput('');
            clearOutcome();
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>
      {output && <Output label={tr('Resultado', 'Result')} value={output} rows={6} />}
      {parsed && parsed.params.length > 0 && (
        <div className="st-table-wrap">
          <table className="st-table">
            <caption>{tr('Parâmetros da URL', 'URL parameters')}</caption>
            <thead>
              <tr>
                <th scope="col">{tr('Nome', 'Name')}</th>
                <th scope="col">{tr('Valor decodificado', 'Decoded value')}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.params.map(([k, v], i) => (
                <tr key={`${k}-${i}`}>
                  <td className="st-mono">{k}</td>
                  <td className="st-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
