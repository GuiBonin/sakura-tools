import { Button, Switch } from '@guibonin/sakura-ui';
import { decodeBase64, encodeBase64 } from '@sakura-tools/tools/base64';
import { useState } from 'react';
import { Output, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useResultFor } from '../lib/useResultFor';

export default function Base64Tool() {
  const { t, tr } = useI18n();
  const [input, setInput] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  // Editar a entrada ou trocar a opção esconde o resultado anterior.
  const [outcome, setOutcome, clearOutcome] = useResultFor<{ output?: string; error?: string }>([
    input,
    urlSafe,
  ]);
  const output = outcome?.output ?? '';
  const error = outcome?.error;

  const run = (mode: 'encode' | 'decode') => {
    try {
      setOutcome({
        output: mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input),
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
        rows={8}
      />
      <Toolbar>
        <Button onClick={() => run('encode')}>{tr('Codificar', 'Encode')}</Button>
        <Button variant="soft" onClick={() => run('decode')} disabled={!input.trim()}>
          {tr('Decodificar', 'Decode')}
        </Button>
        <Switch
          label={tr('URL-safe (Base64URL)', 'URL-safe (Base64URL)')}
          checked={urlSafe}
          onCheckedChange={setUrlSafe}
        />
        <Button variant="ghost" onClick={() => setInput('Olá, Sakura! 🌸')}>
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
      {output && <Output label={tr('Resultado', 'Result')} value={output} rows={8} />}
    </div>
  );
}
