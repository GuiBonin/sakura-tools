import { Button, Select, useTheme, useToast, type ThemeMode } from '@guibonin/sakura-ui';
import type { Locale } from '@sakura-tools/core';
import { Trash2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { clearAll } from '../lib/storage';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export default function Settings() {
  const { t, tr, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  useDocumentMeta(t('nav.settings'));

  return (
    <div className="st-page st-narrow st-stack">
      <h1 className="st-h1">{t('nav.settings')}</h1>
      <Select
        label={t('lang.label')}
        value={locale}
        onValueChange={(v) => setLocale(v as Locale)}
        options={[
          { value: 'pt-BR', label: 'Português (Brasil)' },
          { value: 'en', label: 'English' },
        ]}
      />
      <Select
        label={tr('Tema', 'Theme')}
        value={theme}
        onValueChange={(v) => setTheme(v as ThemeMode)}
        options={[
          { value: 'dark', label: t('theme.dark') },
          { value: 'light', label: t('theme.light') },
          { value: 'system', label: t('theme.system') },
        ]}
      />
      <section className="st-stack-sm">
        <h2 className="st-h2">{tr('Dados locais', 'Local data')}</h2>
        <p className="st-hint">{t('settings.clearDataHint')}</p>
        <div>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={16} />}
            onClick={() => {
              clearAll();
              toast({ title: t('settings.cleared'), tone: 'success' });
            }}
          >
            {t('settings.clearData')}
          </Button>
        </div>
      </section>
    </div>
  );
}
