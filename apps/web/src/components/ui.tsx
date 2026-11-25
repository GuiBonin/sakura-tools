/**
 * Peças compartilhadas que a Sakura UI 0.2.0 não tem (TextArea, bloco de
 * resultado, aviso). Usam só os tokens --sk-* da Sakura UI.
 */
import { Button, cx } from '@guibonin/sakura-ui';
import { Check, CircleAlert, Copy, Info, TriangleAlert } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
  /** Esconde o rótulo visualmente, mantendo para leitores de tela. */
  hideLabel?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, mono = true, hideLabel, className, id, rows = 10, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div className="st-field">
      <label htmlFor={fieldId} className={cx('st-label', hideLabel && 'st-sr-only')}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={cx(
          'st-textarea',
          mono && 'st-mono',
          error ? 'st-textarea--error' : undefined,
          className,
        )}
        {...props}
      />
      {hint && (
        <p id={hintId} className="st-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="st-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label,
  target,
  size = 'sm',
}: {
  value: string;
  label?: string;
  /**
   * O que está sendo copiado (ex.: "SHA-256"). Entra no nome acessível
   * ("Copiar SHA-256") para que vários botões de copiar na mesma tela
   * sejam distinguíveis por leitor de tela.
   */
  target?: string;
  size?: 'sm' | 'md';
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const visible = copied ? t('action.copied') : (label ?? t('action.copy'));
  return (
    <Button
      variant="soft"
      size={size}
      aria-label={target ? `${visible} ${target}` : undefined}
      disabled={value === ''}
      leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      <span aria-live="polite">{visible}</span>
    </Button>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: ReactNode;
  children: ReactNode;
}) {
  const IconCmp =
    tone === 'warning'
      ? TriangleAlert
      : tone === 'danger'
        ? CircleAlert
        : tone === 'success'
          ? Check
          : Info;
  return (
    <div className={`st-notice st-notice--${tone}`} role={tone === 'danger' ? 'alert' : 'note'}>
      <IconCmp size={18} aria-hidden="true" className="st-notice__icon" />
      <div>
        {title && <strong className="st-notice__title">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** Bloco de saída somente leitura com botão de copiar. */
export function Output({
  label,
  value,
  rows = 10,
}: {
  label: ReactNode;
  value: string;
  rows?: number;
}) {
  return (
    <div className="st-output">
      <TextArea label={label} value={value} readOnly rows={rows} />
      <div className="st-output__actions">
        <CopyButton value={value} target={typeof label === 'string' ? label : undefined} />
      </div>
    </div>
  );
}

/** Linha "rótulo: valor" com cópia, para resultados curtos. */
export function ResultRow({
  label,
  value,
  mono = true,
}: {
  label: ReactNode;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="st-result-row">
      <span className="st-result-row__label">{label}</span>
      <code className={cx('st-result-row__value', !mono && 'st-sans')}>{value}</code>
      <CopyButton value={value} target={typeof label === 'string' ? label : undefined} />
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="st-toolbar">{children}</div>;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  // -1 quando o valor atual não está nas opções: nenhuma é anunciada como
  // marcada, mas a primeira continua alcançável pelo Tab.
  const selected = options.findIndex((o) => o.value === value);
  const tabStop = selected === -1 ? 0 : selected;

  // Padrão WAI-ARIA de radiogroup: só a opção marcada entra no Tab, e as
  // setas (com Home/End) mudam a seleção e movem o foco junto. Sem seleção,
  // seta para frente vai à primeira e seta para trás vai à última.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? selected === last
          ? 0
          : selected + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? selected <= 0
            ? last
            : selected - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(options[next]!.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={groupRef} role="radiogroup" aria-label={label} className="st-segmented">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === selected}
          tabIndex={i === tabStop ? 0 : -1}
          className={cx('st-segmented__item', i === selected && 'is-active')}
          onClick={() => onChange(o.value)}
          onKeyDown={onKeyDown}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
