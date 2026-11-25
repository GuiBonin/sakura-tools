# Arquitetura

## Visão geral

```
sakura-tools/                 (público, MIT)
├── apps/web/                 App React + Vite. Interface, rotas, i18n, estado local.
│   ├── src/components/       Layout, command palette, peças de UI que a Sakura UI não tem
│   ├── src/tools/            Um componente por ferramenta (carregado sob demanda)
│   ├── src/pages/            Home, página de ferramenta, categoria, institucionais
│   ├── src/workers/          Web Workers (regex)
│   ├── src/i18n/             Dicionários pt-BR / en
│   └── src/lib/              storage seguro, meta tags, executor de regex
├── packages/core/            Contratos públicos: ToolDefinition, ToolRegistry, entitlements,
│                             SakuraExtension, AIProvider. Sem dependências.
├── packages/tools/           Lógica pura de cada ferramenta + catálogo. Sem React.
├── tests/setup.ts            Setup do Vitest (jsdom)
└── docs/                     Esta documentação
```

Os módulos comerciais (app Pro/Business e backend) vão viver em repositórios privados, que ainda
não existem. Ver "Fronteira público/privado".

## Fluxo de uma ferramenta

1. `packages/tools/src/catalog.ts` declara o `ToolDefinition` (id, slug, nomes, categoria,
   palavras-chave, `execution: 'local'`, `status`).
2. `packages/tools/src/<nome>.ts` tem a lógica pura, testada em `tools.test.ts`.
3. `apps/web/src/tools/<Nome>.tsx` é a interface, registrada em `apps/web/src/registry.ts` com
   `lazy(() => import(...))`. Cada ferramenta vira um chunk separado.
4. `/tools/:slug` resolve pelo `ToolRegistry`, aplica meta tags, registra o ID nos recentes e
   renderiza dentro de um error boundary.

Um teste (`app.test.tsx`) garante que todo item disponível no catálogo tem componente e que todo
componente tem item no catálogo.

## Estado e persistência

| Dado                        | Onde                                 | Observação                                                   |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Tema                        | `localStorage['sakura-tools-theme']` | Gerido pelo `ThemeProvider` da Sakura UI                     |
| Idioma, favoritos, recentes | `localStorage['sakura-tools:*']`     | Só IDs. `useStoredState` sincroniza entre componentes e abas |
| Entradas das ferramentas    | memória do componente                | **Nunca** persistidas                                        |

Leitura do storage tolera dado corrompido, storage bloqueado e cota cheia.

## Fronteira público/privado

O núcleo público define contratos; o comercial implementa.

- `ToolRegistry.extend(tools)` cria um registro novo com ferramentas da extensão. Conflito de ID ou
  slug é erro. Extensões não alteram ferramentas gratuitas.
- `SakuraExtension` = `{ id, version, tools?, entitlements? }`.
- `EntitlementSource.load()` devolve um `EntitlementSnapshot` vindo do backend ou `null` sem sessão.
- `isFeatureVisible(snapshot, key)` serve **só para desenhar a interface**. Toda operação paga é
  revalidada no backend comercial.
- Entitlements são por chave (`ai.requests`, `batch.files`), nunca pelo nome do plano. `Plan` guarda
  `priceCents` configurável e `status: 'planned'` impede venda.
- `AIProvider` (`generate`, `estimateUsage`, `getModelCapabilities`) fica no público só como tipo.
  A implementação e as chaves de provedor existem só no backend. `AIRequest.task` é um nome lógico
  configurado por ambiente, nunca o nome do modelo.

Limitação documentada: recurso premium que roda inteiro no navegador pode ser copiado. Por isso a
regra é: recurso Pro que precisa de proteção roda no servidor (com consentimento explícito quando
envolver dados do usuário); recurso Pro local é tratado como conveniência, não como segredo.

## Segurança

Ver [SECURITY.md](./SECURITY.md).

## Desempenho

- Chunk por ferramenta e por página institucional.
- Bundle principal ~470 kB (~150 kB gzip): React, React Router, Sakura UI e framer-motion. Dá para
  reduzir com `manualChunks` e carregando o framer-motion depois.
- Trabalho pesado (regex) em Web Worker. Parser de arquivos grandes também deve rodar em worker.
