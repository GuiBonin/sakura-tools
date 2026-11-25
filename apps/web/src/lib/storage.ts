import { useCallback, useEffect, useState } from 'react';

/**
 * Acesso ao localStorage que nunca quebra a página (modo privado, storage
 * bloqueado, cota cheia). Guarda só preferências e IDs de ferramentas.
 * Entradas das ferramentas NUNCA passam por aqui.
 */
export const STORAGE_PREFIX = 'sakura-tools:';

export function readJson<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('sakura-storage', { detail: key }));
  } catch {
    // Sem storage a preferência vale só para esta sessão.
  }
}

/** Remove todas as chaves do Sakura Tools (usado em Configurações). */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX) || k === 'sakura-tools-theme') keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent('sakura-storage', { detail: '*' }));
  } catch {
    // nada a limpar
  }
}

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Estado persistido, sincronizado entre componentes e entre abas. */
export function useStoredState<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => readJson(key, fallback, validate));

  useEffect(() => {
    const reload = () => setValue(readJson(key, fallback, validate));
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === key || detail === '*') reload();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_PREFIX + key) reload();
    };
    window.addEventListener('sakura-storage', onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('sakura-storage', onLocal);
      window.removeEventListener('storage', onStorage);
    };
    // fallback e validate são estáveis por contrato (constantes de módulo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeJson(key, next);
    },
    [key],
  );
  return [value, set];
}

const EMPTY: string[] = [];
export const RECENTS_LIMIT = 8;

export function useFavorites() {
  const [favorites, setFavorites] = useStoredState<string[]>('favorites', EMPTY, isStringArray);
  const toggle = useCallback(
    (id: string) =>
      setFavorites(favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]),
    [favorites, setFavorites],
  );
  return { favorites, toggle, isFavorite: (id: string) => favorites.includes(id) };
}

export function useRecents() {
  const [recents, setRecents] = useStoredState<string[]>('recents', EMPTY, isStringArray);
  const push = useCallback(
    (id: string) => {
      const current = readJson('recents', EMPTY, isStringArray);
      setRecents([id, ...current.filter((r) => r !== id)].slice(0, RECENTS_LIMIT));
    },
    [setRecents],
  );
  return { recents, push, clear: () => setRecents([]) };
}
