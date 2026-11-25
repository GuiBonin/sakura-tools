import { ToolError } from './messages';
export type UrlMode = 'component' | 'full';

/**
 * `component` codifica tudo que não é seguro dentro de um parâmetro (inclui `/`, `?`, `&`).
 * `full` preserva a estrutura da URL e só codifica o que é inválido.
 */
export function encodeUrl(text: string, mode: UrlMode = 'component'): string {
  return mode === 'component' ? encodeURIComponent(text) : encodeURI(text);
}

export function decodeUrl(text: string, mode: UrlMode = 'component', plusAsSpace = false): string {
  const input = plusAsSpace ? text.replace(/\+/g, ' ') : text;
  try {
    return mode === 'component' ? decodeURIComponent(input) : decodeURI(input);
  } catch {
    throw new ToolError('url.badPercent');
  }
}

export interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: Array<[string, string]>;
}

export function parseUrl(text: string): ParsedUrl | null {
  try {
    const u = new URL(text);
    return {
      protocol: u.protocol,
      host: u.host,
      pathname: u.pathname,
      hash: u.hash,
      params: [...u.searchParams.entries()],
    };
  } catch {
    return null;
  }
}
