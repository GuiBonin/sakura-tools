import { Button, Dropdown, Tooltip, useMediaQuery, useTheme } from '@guibonin/sakura-ui';
import { CATEGORIES } from '@sakura-tools/core';
import {
  Code,
  Home,
  Languages,
  Map as MapIcon,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { toolPath } from '../lib/toolPath';
import { useI18n } from '../i18n/I18nProvider';
import { useFavorites } from '../lib/storage';
import { registry } from '../registry';
import { CommandPalette } from './CommandPalette';
import { Icon } from './Icon';

/** Mesmo ponto de quebra do CSS (app.css, @media max-width: 900px). */
const MOBILE_QUERY = '(max-width: 900px)';

export const REPO_URL = 'https://github.com/GuiBonin/sakura-tools';

function Logo() {
  return (
    <Link to="/" className="st-logo" aria-label="Sakura Tools">
      <img src="/favicon-192.png" alt="" width={28} height={28} />
      <span>
        Sakura <em>Tools</em>
      </span>
    </Link>
  );
}

function Sidebar() {
  const { t, lt } = useI18n();
  const { favorites } = useFavorites();
  const favTools = favorites.map((id) => registry.getById(id)).filter((x) => x !== undefined);

  return (
    <nav className="st-sidebar__nav" aria-label={t('nav.tools')}>
      <NavLink to="/" end className="st-navlink">
        <Home size={18} aria-hidden="true" /> {t('nav.home')}
      </NavLink>
      {favTools.length > 0 && (
        <div className="st-navgroup">
          <h2 className="st-navgroup__title">
            <Star size={14} aria-hidden="true" /> {t('nav.favorites')}
          </h2>
          {favTools.map((tool) => (
            <NavLink key={tool.id} to={toolPath(tool)} className="st-navlink">
              <Icon name={tool.icon} size={16} /> {lt(tool.name)}
            </NavLink>
          ))}
        </div>
      )}
      {[...CATEGORIES]
        .sort((a, b) => a.order - b.order)
        .map((cat) => {
          const tools = registry.byCategory(cat.id);
          if (tools.length === 0) return null;
          return (
            <div key={cat.id} className="st-navgroup">
              <h2 className="st-navgroup__title">
                <Icon name={cat.icon} size={14} /> {lt(cat.name)}
              </h2>
              {tools.map((tool) => (
                <NavLink key={tool.id} to={toolPath(tool)} className="st-navlink">
                  <Icon name={tool.icon} size={16} /> {lt(tool.name)}
                </NavLink>
              ))}
            </div>
          );
        })}
      <div className="st-navgroup">
        <NavLink to="/roadmap" className="st-navlink">
          <MapIcon size={16} aria-hidden="true" /> {t('nav.roadmap')}
        </NavLink>
        <NavLink to="/settings" className="st-navlink">
          <Settings size={16} aria-hidden="true" /> {t('nav.settings')}
        </NavLink>
      </div>
    </nav>
  );
}

function ThemeMenu() {
  const { t } = useI18n();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const CurrentIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  return (
    <Dropdown
      aria-label={t('theme.toggle')}
      placement="bottom-end"
      trigger={
        <Button variant="ghost" iconOnly aria-label={t('theme.toggle')}>
          <CurrentIcon size={18} />
        </Button>
      }
      items={[
        { label: t('theme.dark'), icon: <Moon size={16} />, onSelect: () => setTheme('dark') },
        { label: t('theme.light'), icon: <Sun size={16} />, onSelect: () => setTheme('light') },
        {
          label: t('theme.system'),
          icon: <Monitor size={16} />,
          onSelect: () => setTheme('system'),
        },
      ]}
    />
  );
}

function LanguageMenu() {
  const { t, setLocale } = useI18n();
  return (
    <Dropdown
      aria-label={t('lang.label')}
      placement="bottom-end"
      trigger={
        <Button variant="ghost" iconOnly aria-label={t('lang.label')}>
          <Languages size={18} />
        </Button>
      }
      items={[
        { label: 'Português (Brasil)', onSelect: () => setLocale('pt-BR') },
        { label: 'English', onSelect: () => setLocale('en') },
      ]}
    />
  );
}

export function Layout() {
  const { t } = useI18n();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteKey, setPaletteKey] = useState(0);
  // O menu móvel fica aberto só na rota em que foi aberto: navegar fecha sozinho.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  // Fora do modo celular o menu nunca está "aberto": alargar a janela com o
  // menu aberto não deixa o fundo escuro cobrindo o desktop.
  const menuOpen = isMobile && menuPath === location.pathname;

  // Ao sair do modo celular o menu é esquecido, para não reabrir sozinho se a
  // janela voltar a ficar estreita.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (!e.matches) setMenuPath(null);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  // Com o menu aberto o resto da tela fica `inert`, inclusive o botão que
  // abriu o menu. Por isso o foco só volta para ele depois de renderizar.
  const restoreFocusRef = useRef(false);
  const openMenu = () => setMenuPath(location.pathname);
  /** Fecha o menu e devolve o foco ao botão que o abriu. */
  const closeMenu = () => {
    restoreFocusRef.current = true;
    setMenuPath(null);
  };

  useEffect(() => {
    if (!menuOpen && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      menuTriggerRef.current?.focus();
    }
  }, [menuOpen]);

  // Ao abrir o menu móvel, o foco vai para dentro dele (botão de fechar),
  // e Escape fecha o menu devolvendo o foco ao botão que o abriu.
  useEffect(() => {
    if (!menuOpen) return;
    menuCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const openPalette = () => {
    setPaletteKey((k) => k + 1);
    setPaletteOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (paletteOpen) setPaletteOpen(false);
        else openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="st-app">
      <a href="#main" className="st-skip" inert={menuOpen}>
        {t('nav.skip')}
      </a>
      {/* No celular, menu fechado fica fora da tela e `inert` tira os links
          dele do Tab e do leitor de tela. Escape fecha o menu aberto. */}
      <aside
        id="st-sidebar"
        className={menuOpen ? 'st-sidebar is-open' : 'st-sidebar'}
        aria-label={t('nav.tools')}
        inert={isMobile && !menuOpen}
      >
        <div className="st-sidebar__head">
          <Logo />
          <Button
            ref={menuCloseRef}
            variant="ghost"
            iconOnly
            className="st-only-mobile"
            aria-label={t('nav.closeMenu')}
            onClick={closeMenu}
          >
            <X size={18} />
          </Button>
        </div>
        <Sidebar />
      </aside>
      {menuOpen && <div className="st-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* Menu aberto no celular funciona como modal: o resto da tela sai do Tab
          e do leitor de tela. */}
      <div className="st-main-col" inert={menuOpen}>
        <header className="st-header">
          <Button
            variant="ghost"
            iconOnly
            className="st-only-mobile"
            ref={menuTriggerRef}
            aria-label={t('nav.openMenu')}
            aria-expanded={menuOpen}
            aria-controls="st-sidebar"
            onClick={openMenu}
          >
            <Menu size={20} />
          </Button>
          <button
            type="button"
            className="st-search-trigger"
            onClick={openPalette}
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search size={16} aria-hidden="true" />
            <span>{t('search.placeholder')}</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <div className="st-header__actions">
            <LanguageMenu />
            <ThemeMenu />
            <Tooltip content={t('nav.source')}>
              <a
                className="st-icon-link"
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('nav.source')}
              >
                <Code size={18} aria-hidden="true" />
              </a>
            </Tooltip>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="st-main">
          <Outlet />
        </main>
        <footer className="st-footer">
          <span>Sakura Tools · MIT · Powered by Sakura UI</span>
          <nav aria-label={t('nav.footer')}>
            <Link to="/pricing">{t('nav.pricing')}</Link>
            <Link to="/roadmap">{t('nav.roadmap')}</Link>
            <Link to="/changelog">{t('nav.changelog')}</Link>
            <Link to="/docs">{t('nav.docs')}</Link>
            <Link to="/contribute">{t('nav.contribute')}</Link>
            <Link to="/privacy">{t('nav.privacy')}</Link>
            <Link to="/terms">{t('nav.terms')}</Link>
          </nav>
        </footer>
      </div>
      <CommandPalette key={paletteKey} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
