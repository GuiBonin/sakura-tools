import { parseFiscalXml, type FiscalParseResult } from '@sakura-tools/fiscal/nfe';
import { msg } from '@sakura-tools/tools/messages';
import { formatXml } from '@sakura-tools/tools/xml';

export interface NfeRun {
  result: FiscalParseResult;
  /** XML indentado para a visão de código, quando a leitura deu certo. */
  formatted: string | null;
}

export const NFE_TIMEOUT_MS = 20_000;

function runHere(xml: string): NfeRun {
  const result = parseFiscalXml(xml);
  const f = result.ok ? formatXml(xml) : null;
  return { result, formatted: f?.ok ? f.output : null };
}

/**
 * Lê o XML num Web Worker descartável, para um arquivo grande não travar a
 * página. `signal` encerra o worker quando a entrada muda. Sem suporte a
 * Worker (ex.: testes), roda na thread principal.
 */
export function parseNfeIsolated(
  xml: string,
  { signal, timeoutMs = NFE_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<NfeRun | null> {
  if (signal?.aborted) return Promise.resolve(null);
  if (typeof Worker === 'undefined') return Promise.resolve(runHere(xml));
  return new Promise((resolve) => {
    const worker = new Worker(new URL('../workers/nfe.worker.ts', import.meta.url), {
      type: 'module',
    });
    const finish = (r: NfeRun | null) => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      resolve(r);
    };
    const onAbort = () => finish(null);
    const fail = () =>
      finish({
        result: { ok: false, error: { message: msg('nfe.workerFailed') } },
        formatted: null,
      });
    const timer = setTimeout(fail, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = (e: MessageEvent<NfeRun>) => finish(e.data);
    worker.onerror = fail;
    worker.postMessage({ xml });
  });
}
