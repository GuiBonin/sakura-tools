import { Button, Checkbox, Input, Spinner } from '@guibonin/sakura-ui';
import type { RegexResult } from '@sakura-tools/tools/regex';
import { useEffect, useMemo, useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { runRegexIsolated } from '../lib/regexRunner';

const FLAGS = [
  ['g', 'global'],
  ['i', 'ignore case'],
  ['m', 'multiline'],
  ['s', 'dotAll'],
  ['u', 'unicode'],
] as const;

export default function RegexTester() {
  const { t, tr } = useI18n();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  // O resultado guarda padrão, flags e texto que o geraram. Se algum mudou,
  // os índices não valem mais para o texto atual e o resultado é escondido.
  const [last, setResult] = useState<{
    pattern: string;
    flags: string;
    text: string;
    result: RegexResult;
  }>();
  const result =
    pattern && last && last.pattern === pattern && last.flags === flags && last.text === text
      ? last.result
      : null;
  const running = pattern !== '' && result === null;

  useEffect(() => {
    if (!pattern) return;
    // Ao mudar padrão, flags ou texto, a execução anterior é abortada e o
    // worker dela encerrado na hora.
    const controller = new AbortController();
    const handle = setTimeout(() => {
      void runRegexIsolated(pattern, flags, text, { signal: controller.signal }).then((r) => {
        if (!controller.signal.aborted) setResult({ pattern, flags, text, result: r });
      });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (!result?.ok || result.matches.length === 0) return null;
    const parts: Array<{ text: string; hit: boolean }> = [];
    let last = 0;
    for (const m of result.matches) {
      if (m.match === '') continue;
      if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
      parts.push({ text: m.match, hit: true });
      last = m.index + m.match.length;
    }
    parts.push({ text: text.slice(last), hit: false });
    return parts;
  }, [result, text]);

  const toggleFlag = (f: string, on: boolean) =>
    setFlags((prev) => (on ? prev + f : prev.replace(f, '')).split('').sort().join(''));

  return (
    <div className="st-stack">
      <Input
        label={tr('Expressão regular', 'Regular expression')}
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        className="st-mono"
        placeholder="(\d{4})-(\d{2})-(\d{2})"
        error={result && !result.ok ? result.error : undefined}
        leftIcon={<span className="st-mono">/</span>}
        rightIcon={<span className="st-mono">/{flags}</span>}
      />
      <Toolbar>
        {FLAGS.map(([f, name]) => (
          <Checkbox
            key={f}
            label={`${f} (${name})`}
            checked={flags.includes(f)}
            onCheckedChange={(v) => toggleFlag(f, v)}
          />
        ))}
      </Toolbar>
      <TextArea
        label={tr('Texto de teste', 'Test string')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
      />
      <Toolbar>
        <Button
          variant="ghost"
          onClick={() => {
            setPattern('(?<ano>\\d{4})-(?<mes>\\d{2})-(?<dia>\\d{2})');
            setText('Emitida em 2026-11-25, vence em 2026-12-10.');
          }}
        >
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPattern('');
            setText('');
          }}
        >
          {t('action.clear')}
        </Button>
        {running && <Spinner size="sm" label={tr('Executando', 'Running')} />}
      </Toolbar>

      {result?.ok && (
        <>
          <p className="st-status" role="status">
            {result.matches.length === 0
              ? tr('Nenhum match.', 'No matches.')
              : tr(`${result.matches.length} match(es).`, `${result.matches.length} match(es).`)}
            {result.truncated && tr(' Lista truncada no limite.', ' List truncated at the limit.')}
          </p>
          {highlighted && (
            <pre
              className="st-pre st-highlight"
              aria-label={tr('Texto com matches destacados', 'Text with highlighted matches')}
            >
              {highlighted.map((p, i) =>
                p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>,
              )}
            </pre>
          )}
          {result.matches.length > 0 && (
            <div className="st-table-wrap">
              <table className="st-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">{tr('Posição', 'Index')}</th>
                    <th scope="col">Match</th>
                    <th scope="col">{tr('Grupos', 'Groups')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.slice(0, 200).map((m, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="st-mono">{m.index}</td>
                      <td className="st-mono">{m.match}</td>
                      <td className="st-mono">
                        {m.named
                          ? Object.entries(m.named)
                              .map(([k, v]) => `${k}=${v ?? '∅'}`)
                              .join(', ')
                          : m.groups.map((g, gi) => `$${gi + 1}=${g ?? '∅'}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <ToolHelp>
        <p>
          {tr(
            'Usa o motor de regex do JavaScript. A execução roda isolada num Web Worker e é interrompida após 1,5 s para proteger a página de expressões catastróficas.',
            'Uses the JavaScript regex engine. Execution runs isolated in a Web Worker and stops after 1.5 s to protect the page from catastrophic patterns.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
