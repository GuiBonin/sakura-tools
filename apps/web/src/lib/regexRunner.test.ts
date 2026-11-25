import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REGEX_CANCELLED, runRegexIsolated } from './regexRunner';

/**
 * Worker falso: registra instâncias e encerramentos. Não responde sozinho,
 * para que o teste controle quando (e se) a execução termina.
 */
class FakeWorker {
  static instances: FakeWorker[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
  reply(result: unknown) {
    this.onmessage?.({ data: { result } } as MessageEvent);
  }
}

describe('runRegexIsolated', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('abortar encerra o worker na hora e resolve como cancelado', async () => {
    const controller = new AbortController();
    const promise = runRegexIsolated('(a+)+$', 'g', 'aaaa!', { signal: controller.signal });
    const worker = FakeWorker.instances[0]!;
    expect(worker.terminated).toBe(false);
    controller.abort();
    expect(worker.terminated).toBe(true);
    await expect(promise).resolves.toEqual(REGEX_CANCELLED);
  });

  it('execução substituída não deixa worker vivo', async () => {
    const first = new AbortController();
    void runRegexIsolated('a', 'g', 'a', { signal: first.signal });
    first.abort();
    const second = runRegexIsolated('b', 'g', 'b');
    FakeWorker.instances[1]!.reply({ ok: true, matches: [], truncated: false });
    await second;
    expect(FakeWorker.instances.every((w) => w.terminated)).toBe(true);
  });

  it('sinal já abortado nem cria worker', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(runRegexIsolated('a', 'g', 'a', { signal: controller.signal })).resolves.toEqual(
      REGEX_CANCELLED,
    );
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('resposta normal encerra o worker e devolve o resultado', async () => {
    const result = { ok: true, matches: [], truncated: false };
    const promise = runRegexIsolated('a', 'g', 'a');
    FakeWorker.instances[0]!.reply(result);
    await expect(promise).resolves.toEqual(result);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
  });

  it('timeout encerra o worker e explica o motivo', async () => {
    vi.useFakeTimers();
    const promise = runRegexIsolated('(a+)+$', 'g', 'aaaa!', { timeoutMs: 100 });
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toMatchObject({ ok: false, error: /interrompida/ });
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
  });

  it('erro no worker vira resultado de erro', async () => {
    const promise = runRegexIsolated('a', 'g', 'a');
    FakeWorker.instances[0]!.onerror?.({ message: 'falhou' } as ErrorEvent);
    await expect(promise).resolves.toEqual({ ok: false, error: 'falhou' });
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
  });

  it('abortar depois de terminar não faz nada', async () => {
    const controller = new AbortController();
    const result = { ok: true, matches: [], truncated: false };
    const promise = runRegexIsolated('a', 'g', 'a', { signal: controller.signal });
    FakeWorker.instances[0]!.reply(result);
    controller.abort();
    await expect(promise).resolves.toEqual(result);
  });
});
