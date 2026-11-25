import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { CSP } from './csp.ts';

/**
 * Injeta a Content Security Policy só no build. Em desenvolvimento o Vite
 * precisa de script inline para o hot reload, que a CSP bloquearia.
 * `frame-ancestors` não funciona via <meta>; ele vai nos headers do host
 * (ver apps/web/public/_headers).
 */
function cspPlugin(): Plugin {
  return {
    name: 'sakura-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
