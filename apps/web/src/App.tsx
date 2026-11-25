import { Spinner } from '@guibonin/sakura-ui';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ToolPage from './pages/ToolPage';

const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const Settings = lazy(() => import('./pages/Settings'));
const content = () => import('./pages/ContentPages');
const Pricing = lazy(() => content().then((m) => ({ default: m.Pricing })));
const Roadmap = lazy(() => content().then((m) => ({ default: m.Roadmap })));
const Changelog = lazy(() => content().then((m) => ({ default: m.Changelog })));
const Docs = lazy(() => content().then((m) => ({ default: m.Docs })));
const Contribute = lazy(() => content().then((m) => ({ default: m.Contribute })));
const Privacy = lazy(() => content().then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => content().then((m) => ({ default: m.Terms })));

export function AppRoutes() {
  return (
    <Suspense fallback={<Spinner label="Carregando" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tools/:slug" element={<ToolPage />} />
          <Route path="categories/:id" element={<CategoryPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="changelog" element={<Changelog />} />
          <Route path="docs" element={<Docs />} />
          <Route path="contribute" element={<Contribute />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
