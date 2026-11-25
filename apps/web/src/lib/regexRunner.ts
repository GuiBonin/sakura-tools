import { runRegex, type RegexResult } from '@sakura-tools/tools/regex';

export const REGEX_TIMEOUT_MS = 1500;

export const REGEX_CANCELLED: RegexResult = { ok: false, error: 'Execução cancelada.' };

/**
 * Executa a regex num Web Worker descartável com timeout. Uma expressão
 * catastrófica (ex.: `(a+)+$`) trava só o worker, que é encerrado.
 *
 * `signal` cancela a execução: o worker é encerrado na hora, em vez de
 * continuar gastando CPU até o timeout quando o usuário já digitou outra coisa.
 * Sem suporte a Worker (ex.: testes), roda na thread principal.
 */
export function runRegexIsolated(
  pattern: string,
  flags: string,
  text: string,
  { timeoutMs = REGEX_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<RegexResult> {
  if (signal?.aborted) return Promise.resolve(REGEX_CANCELLED);
  if (typeof Worker === 'undefined') {
    return Promise.resolve(runRegex(pattern, flags, text));
  }
  return new Promise((resolve) => {
    const worker = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), {
      type: 'module',
    });
    const finish = (result: RegexResult) => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => finish(REGEX_CANCELLED);
    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          error: `A expressão demorou mais de ${timeoutMs} ms e foi interrompida. Ela pode ter backtracking catastrófico.`,
        }),
      timeoutMs,
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = (e: MessageEvent<{ result: RegexResult }>) => finish(e.data.result);
    worker.onerror = (e) =>
      finish({ ok: false, error: e.message || 'Falha ao executar a expressão.' });
    worker.postMessage({ id: 1, pattern, flags, text });
  });
}
