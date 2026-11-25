# Estado do projeto

Última atualização: 25/11/2026, fim da primeira sessão (Fase 0 concluída, Fase 1 implementada).

## Fase atual

Fase 1 (núcleo gratuito). Funcionalidade implementada e testada. Pendências menores em
`NEXT_STEPS.md`.

## Concluído

- **Fase 0:** Sakura UI inspecionada (`@guibonin/sakura-ui@0.2.0` no npm, MIT, React ≥ 18,
  depende de framer-motion e lucide-react; tokens `--sk-*`, `data-theme` light/dark,
  `SakuraProvider` com tema, movimento reduzido e toasts; 17 componentes). Arquitetura e decisões
  em `ARCHITECTURE.md` e `DECISIONS.md`.
- **Núcleo:** monorepo npm workspaces; `packages/core` (registro, busca sem acento, categorias,
  contratos de entitlements, extensões e IA); `packages/tools` (lógica pura + catálogo).
- **Interface:** sidebar responsiva com menu móvel, header, busca global Ctrl+K acessível,
  categorias, home com favoritos, recentes e todas as ferramentas, temas (Sakura UI), pt-BR e en,
  configurações (idioma, tema, apagar dados locais), páginas de planos, roadmap, changelog, docs,
  contribuição, privacidade e termos, 404, toasts.
- **15 ferramentas:** JSON, XML, Base64, URL, UUID, senha, cores, regex, diff, timestamp, QR Code,
  hash (SHA-256 e outras), JWT, CPF, CNPJ. Todas locais, com URL própria (`/tools/:slug`).
- **Segurança:** CSP no build, `_headers` para Cloudflare Pages, XML sem DTD, regex em worker com
  timeout, lint proibindo `Math.random`, nenhuma entrada persistida.
- **Repositório:** README pt/en, LICENSE MIT, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG,
  AGENTS.md, CLAUDE.md, `.env.example`, CI no GitHub Actions, Dependabot, templates de issue e PR.

## Testes executados (25/11/2026)

| Verificação                                   | Resultado                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                | 0 erros, 0 avisos                                                                                                           |
| `npm run format:check`                        | ok                                                                                                                          |
| `npm run typecheck` (core, tools, web)        | ok                                                                                                                          |
| `npm test`                                    | 199 testes em 12 arquivos, todos passando                                                                                   |
| `npm run test:e2e`                            | 68 testes Playwright (desktop 1366 px e celular 375 px), todos passando                                                     |
| `npm run build`                               | ok, CSP injetada no `dist/index.html`                                                                                       |
| `npm audit --omit=dev`                        | 0 vulnerabilidades                                                                                                          |
| Navegador (Chrome, build de produção com CSP) | regex no worker ok; `(a+)+$` interrompido em 1,5 s sem travar a thread principal; QR Code renderiza; home e título corretos |

Cobertura por tipo: 87 testes de lógica pura (vetores conhecidos de SHA-256/512 e HMAC, exemplo
oficial de CNPJ alfanumérico da Receita, JWT do jwt.io, XXE, limites); 47 testes de integração em
jsdom (rotas, busca, favoritos, recentes sem vazar entrada, storage corrompido, idioma, cada
ferramenta renderiza, interações principais de cada ferramenta, apagar dados locais).

## Sem cobertura (e por quê)

- **Leitor de tela real:** não testado. O axe e os testes de foco cobrem só o que dá para
  automatizar.
- **Tablet:** o Playwright roda em 1366 px e 375 px. Larguras intermediárias foram vistas só no
  Chrome, a olho.

## Problemas conhecidos

- Bundle principal ~470 kB (~150 kB gzip), puxado por React, Sakura UI e framer-motion.
- Mensagens de erro dos pacotes de lógica só em português (D-005).
- SPA sem pré-renderização: SEO depende de buscador executar JS (D-012).
- Com o menu do celular aberto, o conteúdo atrás ainda é alcançável por Tab (menu não modal).
- O ícone/logo é um SVG provisório (flor de cinco pétalas), não uma identidade final.

## Bloqueios

Nenhum para a parte gratuita. A parte comercial é planejada fora deste repositório.

## Dependências principais

React 19.3, React Router 8.5, Vite 8.3, TypeScript 6.0, Vitest 5.1, ESLint 9.39,
@guibonin/sakura-ui 0.2.0, lucide-react 1.80, qrcode 1.5.4 (MIT), diff 9.0 (BSD-3-Clause).

## Git

Repositório inicializado em 25/11/2026 (`git init -b main`), sem remoto. Antes do commit inicial,
o planejamento comercial foi retirado do repositório: `docs/PRODUCT_SPEC.md` virou a versão
pública do núcleo, e a especificação completa ficou fora do Git público.

## Revisão do Codex (25/11/2026)

Revisão somente leitura com o Codex encontrou 8 problemas, todos reproduzidos e corrigidos com
teste de regressão (bloco "Regressões da revisão do Codex" em `packages/tools/src/tools.test.ts`):
JSON com aninhamento profundo estourava a pilha; ordenar chaves perdia `__proto__`; XML
formatado/minificado alterava texto de conteúdo misto; XML aceitava `&#0;`, `--` em comentário e
atributos sem espaço; entropia de senha superestimada; regex com flag `u` repetia match vazio
dentro de emoji; cor aceitava `rgb(10foo, …)`; UUID v7 truncava timestamp fora de 48 bits.
O Codex não comentou CPF/CNPJ, JWT, CSP, storage, workers nem acessibilidade; isso não equivale
a aprovação dessas áreas.

## QA do Codex (25/11/2026)

Segunda rodada, papel de QA. Confirmou 7 das 8 correções anteriores e achou 8 problemas, todos
corrigidos com teste (`packages/tools/src/qa-regressions.test.ts` e
`apps/web/src/stale-results.test.tsx`): espaço entre elementos ainda removido no XML; referência
numérica com zeros à esquerda recusada; JWT com `exp` absurdo aparecia como vigente; `nbf` futuro
escondia `exp` passado; data impossível (2026-02-30) era ajustada; hash, QR Code e regex podiam
mostrar resultado da entrada anterior; `cmyk(0,,0,0,0)` aceito; CNPJ `AAAAAAAAAAAA45` aceito.
Por decisão do dono, CNPJ com raiz e ordem de um caractere só passa a ser recusado e o JWT mostra
os dois selos. Storage, worker, Layout, busca Ctrl+K, CSP e acessibilidade seguem sem revisão
independente.

## Terceira rodada do Codex (25/11/2026)

Confirmou as correções anteriores e achou 4 problemas, corrigidos com teste: minificação de XML
esvaziava elemento sem filhos cujo conteúdo é só espaço (`<x>\n  </x>`); execução de regex
substituída continuava rodando no worker até o timeout (agora `AbortSignal` encerra o worker,
`apps/web/src/lib/regexRunner.test.ts`); seletor `Segmented` anunciava radiogroup sem navegação
por setas; menu móvel não recebia foco nem fechava com Escape (agora também fica `inert` quando
fechado no celular). Testes de acessibilidade em `apps/web/src/a11y.test.tsx`.

## Revisão de UI/UX (25/11/2026)

O Codex revisou o código da interface (só leitura; a escrita foi bloqueada pelo controle de
permissões e não foi contornada). A checagem visual foi feita no Chrome com o build de produção:
temas claro e escuro, português e inglês, 22 páginas em largura estreita (o Chrome não estreita
abaixo de 485 px, então 375 px reais não foram testados) sem rolagem horizontal. Corrigido com
teste (`apps/web/src/ui-review.test.tsx`, `apps/web/src/segmented.test.tsx`, `a11y.test.tsx`):
menu móvel deixava o fundo escuro ao alargar a janela; Segmented com valor inválido marcava a
primeira opção; erro do QR Code invisível no modo Wi-Fi e estado "Gerando QR Code…"; resultado
antigo visível no diff, Base64, URL e JSON; botões "Copiar" sem nome distinto; contraste do rosa
no tema claro; rolagem suave ignorando movimento reduzido; "v4 (aleatório)" e "Rodapé" sem
tradução; aviso de privacidade da home com fonte grande.

Sugestões pendentes de decisão do dono: traduzir mensagens de erro dos pacotes (D-005); "Exemplo"
e "Limpar" em cor, CPF, CNPJ, senha, QR, timestamp e UUID, e remover arquivo no hash; alvos de
toque de 44 px (Segmented 29 px, rodapé 21 px); copiar o diff.

## UX e E2E (25/11/2026)

Aplicadas as sugestões de UX aprovadas: Exemplo e Limpar em cor, CPF, CNPJ, QR Code, timestamp e
UUID; "Restaurar padrões" no gerador de senha; remover arquivo no hash; copiar o diff (formato
+/- por linha ou [-removido-]{+adicionado+}); áreas de toque de 44 px no celular. Testes em
`apps/web/src/ux.test.tsx`.

Playwright em `e2e/app.spec.ts`, contra o build de produção com a CSP real: as 15 ferramentas
sem erro de console, sem rolagem horizontal a 375 px e sem requisição para fora do app; regex
catastrófica interrompida no worker real com a thread principal livre; download do PNG do QR
Code; busca Ctrl+K; favoritos após recarregar; menu do celular; alvos de toque ≥ 44 px; axe sem
violações sérias ou críticas (WCAG 2 A/AA) em 6 páginas nos temas claro e escuro.

Pendências conhecidas: mensagens de erro dos pacotes só em português (D-005); com o menu do
celular aberto, o conteúdo atrás ainda é alcançável por Tab (o menu não é modal); leitor de tela
real não foi testado.
