import '@guibonin/sakura-ui/styles.css';
import './styles/app.css';

import { SakuraProvider } from '@guibonin/sakura-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './App';
import { I18nProvider } from './i18n/I18nProvider';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <SakuraProvider
      defaultTheme="dark"
      storageKey="sakura-tools-theme"
      toast={{ position: 'bottom-right' }}
    >
      <I18nProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </I18nProvider>
    </SakuraProvider>
  </StrictMode>,
);
