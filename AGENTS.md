# AGENTS.md

Instruções para qualquer agente de programação (Claude Code, Codex, outros). Leia antes de mudar
qualquer arquivo. Agentes não compartilham memória: o estado do projeto vive em `docs/`.

## Leia primeiro

1. `docs/PROJECT_STATE.md`: fase atual, o que está pronto, o que falta, problemas conhecidos.
2. `docs/NEXT_STEPS.md`: próximas ações em ordem.
3. `docs/DECISIONS.md`: decisões que não devem ser desfeitas sem nova entrada.
4. `docs/PRODUCT_SPEC.md`: requisitos do núcleo gratuito.
5. `docs/ARCHITECTURE.md` e `docs/SECURITY.md`.

## Comandos

```bash
npm install          # Node >= 20.19 (o projeto usa 22 no CI)
npm run dev          # app em http://localhost:5173
npm test             # Vitest (unitários + integração jsdom)
npm run typecheck
npm run lint
npm run format:check
npm run build        # typecheck do app + build de produção
npm run check        # tudo acima, na ordem do CI
npm run test:e2e     # Playwright contra o build de produção (desktop e 375 px)
                     # local usa o Google Chrome instalado; no CI, o Chromium do Playwright
```

## Regras do projeto

- Idioma: português do Brasil em código, comentários, docs e commits. Inglês é o segundo idioma
  da interface.
- TypeScript strict. Sem `any` sem justificativa.
- Toda funcionalidade nova tem teste. Teste não pode só confirmar mock.
- Nunca declarar teste aprovado sem rodar. Nunca inventar resultado, endpoint ou credencial.
- Ferramentas gratuitas rodam 100% no navegador. Nada de rede, nada de telemetria.
- Entrada de ferramenta nunca vai para storage.
- Aleatoriedade só com `crypto.getRandomValues` (o lint bloqueia `Math.random`).
- XML: nunca aceitar DOCTYPE/ENTITY.
- Use componentes da Sakura UI (`@guibonin/sakura-ui`) quando existirem. Não invente props: confira
  em `node_modules/@guibonin/sakura-ui/dist/index.d.ts`. O que faltar vai para
  `docs/SAKURA_UI_PROPOSALS.md`; não altere o repositório da Sakura UI.
- Ferramenta não implementada só aparece com `status: 'planned'`, nunca como funcional.
- Para adicionar ferramenta: `docs/ADDING_A_TOOL.md`.

## Fronteira público/privado

Este repositório é público (MIT). Nunca adicione aqui: código Pro/Business, segredos, chaves,
URLs de backend privado, dados de clientes, documentos fiscais reais. Contratos de extensão ficam em
`packages/core`. Implementações comerciais vão para `sakura-tools-pro` e `sakura-tools-api`
(privados, ainda não criados).

O planejamento comercial (preços, custos, arquitetura proprietária, detalhes do Pro e do Business)
fica fora deste repositório, numa pasta privada irmã (`../sakura-internal`) quando ela existir na
máquina. Nada aqui depende dela. Se você tiver acesso a ela, não copie nada de lá para cá.

## Ações que exigem autorização do dono

Commits, push, publicação (npm, deploy), criação de recursos pagos, chamadas de IA com custo,
comandos destrutivos (`git reset --hard`, force push), alterações em outros repositórios.

## Ao terminar uma etapa

Rode `npm run check`, atualize `docs/PROJECT_STATE.md`, `docs/NEXT_STEPS.md` e, se houve decisão
relevante, `docs/DECISIONS.md`.
