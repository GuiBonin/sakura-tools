# Como adicionar uma ferramenta

Exemplo: um contador de palavras com slug `word-counter`.

## 1. Lógica pura e testes

Crie `packages/tools/src/wordCounter.ts` sem React e sem acesso a DOM:

```ts
export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/u).length;
}
```

Adicione os testes no mesmo pacote (ex.: `packages/tools/src/wordCounter.test.ts`). Cubra entrada
vazia, Unicode, entradas grandes e erros. Exporte em `packages/tools/src/index.ts`.

Mensagens de erro e avisos não ficam escritos na lógica. Cadastre o texto em pt-BR e en em
`packages/tools/src/messages.ts` e lance `new ToolError('codigo', { param })` ou devolva
`msg('codigo')`. A interface mostra com `em(erro)` do `useI18n()`, no idioma escolhido.
Um teste falha se faltar um idioma ou se os parâmetros `{nome}` forem diferentes entre eles.

## 2. Catálogo

Em `packages/tools/src/catalog.ts`, adicione:

```ts
{
  ...local,
  id: 'word-counter',
  slug: 'word-counter',
  status: 'stable',
  category: 'text',
  icon: 'Type',
  name: { 'pt-BR': 'Contador de palavras', en: 'Word Counter' },
  description: { 'pt-BR': 'Conta palavras e caracteres.', en: 'Counts words and characters.' },
  keywords: ['contar', 'palavras', 'word', 'count'],
},
```

Se o ícone ainda não estiver em `apps/web/src/components/Icon.tsx`, importe-o lá do `lucide-react`.

## 3. Interface

Crie `apps/web/src/tools/WordCounter.tsx` com `export default`. Use componentes da Sakura UI e as
peças de `components/ui.tsx` (`TextArea`, `Output`, `CopyButton`, `Notice`, `Toolbar`). Textos com
`tr('pt', 'en')`. Inclua botões de exemplo e limpar quando fizer sentido.

Registre em `apps/web/src/registry.ts`:

```ts
'word-counter': lazy(() => import('./tools/WordCounter')),
```

## 4. Verificação

```bash
npm run check
```

O teste `Registro x componentes` falha se o catálogo e o registro de componentes divergirem. O
teste `%s renderiza sem erro` passa a cobrir a nova ferramenta automaticamente.

## Regras

- Nada de rede. Se a ferramenta precisar de servidor, ela é `execution: 'remote'` e pertence a um
  módulo apropriado.
- Nunca persistir a entrada do usuário.
- Processamento pesado vai para Web Worker.
- Aleatoriedade só com `crypto.getRandomValues`.
