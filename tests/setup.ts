import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
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

// Com a suíte inteira rodando em paralelo, o jsdom fica lento e o chunk de uma
// ferramenta (lazy) pode passar de 1 s para carregar. O padrão de 1 s gerava
// falhas intermitentes em findBy*; 5 s só pesa quando o teste já ia falhar.
configure({ asyncUtilTimeout: 5000 });
