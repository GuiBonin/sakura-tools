import { Button, Checkbox, ProgressBar } from '@guibonin/sakura-ui';
import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_MAX_LENGTH,
  generatePassword,
  passwordEntropy,
  strengthFromEntropy,
  type PasswordOptions,
} from '@sakura-tools/tools/password';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { CopyButton, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

const STRENGTH_EN: Record<string, string> = {
  'muito fraca': 'very weak',
  fraca: 'weak',
  razoável: 'fair',
  forte: 'strong',
  'muito forte': 'very strong',
};

function safeGenerate(o: PasswordOptions): { value: string; error?: unknown } {
  try {
    return { value: generatePassword(o) };
  } catch (e) {
    return { value: '', error: e };
  }
}

export default function PasswordGenerator() {
  const { tr, locale, em } = useI18n();
  const [opts, setOpts] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [result, setResult] = useState(() => safeGenerate(DEFAULT_PASSWORD_OPTIONS));

  const update = (patch: Partial<PasswordOptions>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    setResult(safeGenerate(next));
  };

  const bits = passwordEntropy(opts);
  const label = strengthFromEntropy(bits);

  return (
    <div className="st-stack">
      <div className="st-password" aria-live="polite">
        <code className="st-password__value">{result.value || '—'}</code>
        <Button
          variant="ghost"
          iconOnly
          aria-label={tr('Gerar outra', 'Generate another')}
          onClick={() => setResult(safeGenerate(opts))}
        >
          <RefreshCw size={18} />
        </Button>
        <CopyButton value={result.value} size="md" />
      </div>
      {result.error !== undefined && (
        <p className="st-status st-status--danger" role="alert">
          {em(result.error)}
        </p>
      )}
      <Toolbar>
        {/* Senha não tem "exemplo"; o equivalente útil é voltar à configuração recomendada. */}
        <Button
          variant="ghost"
          onClick={() => {
            setOpts(DEFAULT_PASSWORD_OPTIONS);
            setResult(safeGenerate(DEFAULT_PASSWORD_OPTIONS));
          }}
        >
          {tr('Restaurar padrões', 'Reset to defaults')}
        </Button>
      </Toolbar>
      <div>
        <label className="st-label" htmlFor="pw-length">
          {tr('Tamanho', 'Length')}: {opts.length}
        </label>
        <input
          id="pw-length"
          className="st-range"
          type="range"
          min={4}
          max={Math.min(PASSWORD_MAX_LENGTH, 128)}
          value={opts.length}
          onChange={(e) => update({ length: Number(e.target.value) })}
        />
      </div>
      <Toolbar>
        <Checkbox
          label="a–z"
          checked={opts.lowercase}
          onCheckedChange={(v) => update({ lowercase: v })}
        />
        <Checkbox
          label="A–Z"
          checked={opts.uppercase}
          onCheckedChange={(v) => update({ uppercase: v })}
        />
        <Checkbox
          label="0–9"
          checked={opts.digits}
          onCheckedChange={(v) => update({ digits: v })}
        />
        <Checkbox
          label="!@#$"
          checked={opts.symbols}
          onCheckedChange={(v) => update({ symbols: v })}
        />
        <Checkbox
          label={tr('Sem caracteres ambíguos (0 O l 1)', 'No ambiguous characters (0 O l 1)')}
          checked={opts.excludeAmbiguous}
          onCheckedChange={(v) => update({ excludeAmbiguous: v })}
        />
      </Toolbar>
      <div>
        <ProgressBar
          value={Math.min(100, (bits / 128) * 100)}
          label={`${tr('Entropia', 'Entropy')}: ${bits} bits (${locale === 'en' ? STRENGTH_EN[label] : label})`}
          showValue={false}
          tone={bits < 60 ? 'danger' : bits < 80 ? 'warning' : 'success'}
        />
      </div>
      <ToolHelp>
        <p>
          {tr(
            'As senhas são geradas com crypto.getRandomValues no seu navegador, sem viés estatístico. Nada é enviado nem salvo. A entropia é teórica e supõe que a senha foi gerada aqui.',
            'Passwords are generated with crypto.getRandomValues in your browser, without statistical bias. Nothing is sent or saved. Entropy is theoretical and assumes the password was generated here.',
          )}
        </p>
      </ToolHelp>
    </div>
  );
}
