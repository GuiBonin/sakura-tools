import { LOCALES, type Locale, type LocalizedText } from '@sakura-tools/core';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useStoredState } from '../lib/storage';
import { en, ptBR, type MessageKey } from './messages';

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey) => string;
  /** Texto inline para strings específicas de uma ferramenta. */
  tr: (pt: string, english: string) => string;
  /** Resolve um LocalizedText do catálogo, caindo para pt-BR. */
  lt: (text: LocalizedText) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pt-BR';
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useStoredState<Locale>(
    'locale',
    initialLocale ?? detectLocale(),
    isLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: MessageKey) => (locale === 'en' ? en[key] : ptBR[key]), [locale]);
  const tr = useCallback(
    (pt: string, english: string) => (locale === 'en' ? english : pt),
    [locale],
  );
  const lt = useCallback((text: LocalizedText) => text[locale] ?? text['pt-BR'], [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, tr, lt }), [locale, setLocale, t, tr, lt]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>.');
  return ctx;
}
