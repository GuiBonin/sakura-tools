import { useCallback, useState } from 'react';

/**
 * Resultado ligado à entrada que o gerou. Quando a entrada (texto, modo,
 * opções) muda, o resultado antigo deixa de ser exibido em vez de ficar na
 * tela pronto para ser copiado como se fosse da entrada nova.
 *
 * `inputs` precisa ser serializável em JSON (strings, números, booleanos).
 */
export function useResultFor<T>(
  inputs: unknown[],
): [T | undefined, (value: T) => void, () => void] {
  const key = JSON.stringify(inputs);
  const [state, setState] = useState<{ key: string; value: T }>();
  const set = useCallback((value: T) => setState({ key, value }), [key]);
  const clear = useCallback(() => setState(undefined), []);
  return [state?.key === key ? state.value : undefined, set, clear];
}
