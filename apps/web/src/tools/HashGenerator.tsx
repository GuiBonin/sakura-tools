import { Button, Input, Spinner } from '@guibonin/sakura-ui';
import {
  HASH_ALGORITHMS,
  hashBytes,
  hashText,
  hashesMatch,
  hmac,
  type HashAlgorithm,
} from '@sakura-tools/tools/hash';
import { Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResultRow, Segmented, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

/** Arquivos maiores que isso são recusados para não estourar memória da aba. */
const MAX_FILE = 512 * 1024 * 1024;

type Hashes = Partial<Record<HashAlgorithm | 'HMAC-SHA-256', string>>;

interface HashInput {
  source: 'text' | 'file';
  text: string;
  hmacKey: string;
  file: File | null;
}

function sameInput(a: HashInput, b: HashInput): boolean {
  if (a.source !== b.source) return false;
  return a.source === 'text' ? a.text === b.text && a.hmacKey === b.hmacKey : a.file === b.file;
}

export default function HashGenerator() {
  const { t, tr, em } = useI18n();
  const [source, setSource] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('');
  const [hmacKey, setHmacKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expected, setExpected] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // O resultado guarda a entrada que o gerou. Só é exibido se a entrada ainda
  // for a mesma: trocar de arquivo ou de texto nunca mostra hash do anterior.
  const [result, setResult] = useState<{ input: HashInput; hashes?: Hashes; error?: unknown }>();
  const current: HashInput = { source, text, hmacKey, file };
  const fresh = result && sameInput(result.input, current) ? result : undefined;
  const hashes: Hashes = fresh?.hashes ?? {};
  const error = fresh?.error;
  const busy = source === 'file' && file !== null && !fresh;

  useEffect(() => {
    let cancelled = false;
    const input: HashInput = { source, text, hmacKey, file };
    const run = async (): Promise<{ hashes?: Hashes; error?: unknown }> => {
      if (source === 'text') {
        const out: Hashes = {};
        for (const alg of HASH_ALGORITHMS) out[alg] = await hashText(text, alg);
        if (hmacKey) out['HMAC-SHA-256'] = await hmac(text, hmacKey);
        return { hashes: out };
      }
      if (!file) return { hashes: {} };
      if (file.size > MAX_FILE) {
        return { error: tr('Arquivo maior que 512 MB.', 'File larger than 512 MB.') };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const out: Hashes = {};
      for (const alg of HASH_ALGORITHMS) out[alg] = await hashBytes(bytes, alg);
      return { hashes: out };
    };
    run()
      .catch((e: unknown) => ({ error: e }))
      .then((r) => {
        if (!cancelled) setResult({ input, ...r });
      });
    return () => {
      cancelled = true;
    };
  }, [source, text, hmacKey, file, tr]);

  const match = expected.trim()
    ? Object.values(hashes).some((h) => h && hashesMatch(h, expected))
    : null;

  return (
    <div className="st-stack">
      <Segmented
        label={tr('Origem', 'Source')}
        value={source}
        onChange={setSource}
        options={[
          { value: 'text', label: tr('Texto', 'Text') },
          { value: 'file', label: tr('Arquivo', 'File') },
        ]}
      />
      {source === 'text' ? (
        <>
          <TextArea
            label={tr('Texto', 'Text')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <Input
            label={tr('Chave HMAC (opcional)', 'HMAC key (optional)')}
            type="password"
            autoComplete="off"
            value={hmacKey}
            onChange={(e) => setHmacKey(e.target.value)}
          />
          <Toolbar>
            <Button variant="ghost" onClick={() => setText('abc')}>
              {t('action.example')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setText('');
                setHmacKey('');
              }}
            >
              {t('action.clear')}
            </Button>
          </Toolbar>
        </>
      ) : (
        <div
          className="st-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="st-sr-only"
            id="hash-file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="soft"
            leftIcon={<Upload size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            {tr('Escolher arquivo', 'Choose file')}
          </Button>
          <p className="st-hint">
            {file
              ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
              : tr(
                  'Ou arraste um arquivo aqui. Ele não sai do seu computador.',
                  'Or drop a file here. It never leaves your computer.',
                )}
          </p>
          {file && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X size={16} />}
              onClick={() => {
                setFile(null);
                // Limpa o input para que o mesmo arquivo possa ser escolhido de novo.
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              {tr('Remover arquivo', 'Remove file')}
            </Button>
          )}
        </div>
      )}
      {error !== undefined && (
        <p className="st-status st-status--danger" role="alert">
          {em(error)}
        </p>
      )}
      {busy ? (
        <Spinner label={tr('Calculando', 'Hashing')} />
      ) : (
        <div className="st-stack-sm">
          {Object.entries(hashes).map(([alg, h]) => (
            <ResultRow key={alg} label={alg} value={h ?? ''} />
          ))}
        </div>
      )}
      <Input
        label={tr(
          'Comparar com hash esperado (verificação de integridade)',
          'Compare with expected hash (integrity check)',
        )}
        value={expected}
        onChange={(e) => setExpected(e.target.value)}
        className="st-mono"
      />
      {match !== null && (
        <p
          className={`st-status ${match ? 'st-status--success' : 'st-status--danger'}`}
          role="status"
        >
          {match
            ? tr('Confere com um dos hashes acima.', 'Matches one of the hashes above.')
            : tr('Não confere com nenhum hash.', 'Does not match any hash.')}
        </p>
      )}
      <p className="st-hint">
        {tr(
          'SHA-1 aparece só para compatibilidade. Não use SHA-1 para segurança.',
          'SHA-1 is shown only for compatibility. Do not use SHA-1 for security.',
        )}
      </p>
    </div>
  );
}
