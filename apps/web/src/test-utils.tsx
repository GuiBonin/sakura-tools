import { SakuraProvider } from '@guibonin/sakura-ui';
import type { Locale } from '@sakura-tools/core';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from './App';
import { I18nProvider } from './i18n/I18nProvider';

export function renderApp(path = '/', locale: Locale = 'pt-BR') {
  return render(
    <SakuraProvider defaultTheme="dark" storageKey={false} toast={{}}>
      <I18nProvider initialLocale={locale}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </I18nProvider>
    </SakuraProvider>,
  );
}
