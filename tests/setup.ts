import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // jsdom sem storage: nada a limpar.
  }
});

// jsdom não implementa matchMedia; a Sakura UI usa para tema e movimento reduzido.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom não implementa rolagem; o Layout rola para o topo a cada navegação.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
