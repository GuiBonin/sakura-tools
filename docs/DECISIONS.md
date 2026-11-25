# Decisões de arquitetura

Formato: contexto, decisão, consequência. Decisões novas entram no fim com número sequencial.
Reverter uma decisão exige uma nova entrada explicando o motivo.

## D-001 · Monorepo com npm workspaces (25/11/2026)

**Contexto.** A Sakura UI já usa npm workspaces. O ambiente tem Node 24 e npm 11; pnpm não está
instalado.
**Decisão.** npm workspaces com `apps/web`, `packages/core` e `packages/tools`.
**Consequência.** Zero ferramenta extra para contribuidores. Se o número de pacotes crescer muito,
reavaliar pnpm ou turborepo.

## D-002 · Pacotes internos consumidos como código-fonte TypeScript (25/11/2026)

**Contexto.** Pacotes com etapa de build própria adicionam complexidade sem ganho enquanto só o app
web os consome.
**Decisão.** `exports` apontam para `src/*.ts`. O Vite compila tudo.
**Consequência.** Quando o `sakura-tools-pro` precisar consumir o núcleo como dependência versionada,
os pacotes `core` e `tools` vão ganhar build (`vite build` em modo lib + `.d.ts`) e publicação no npm.
Está registrado em NEXT_STEPS.

## D-003 · Estrutura menor que a conceitual do prompt (25/11/2026)

**Contexto.** O prompt sugere `packages/{core,tools,fiscal,shared,config,i18n}`.
**Decisão.** Começar só com `core` (contratos, registro, categorias) e `tools` (lógica pura e
catálogo). i18n fica em `apps/web/src/i18n` porque só o app usa. `fiscal` nasce na Fase 2, com
código real. `shared` e `config` não foram criados porque não há conteúdo para eles.
**Consequência.** Sem pacotes vazios. Criar cada um quando houver o primeiro consumidor real.

## D-004 · Toolchain alinhada com a Sakura UI (25/11/2026)

**Contexto.** As versões "latest" no npm eram TypeScript 7.0 (port nativo) e ESLint 10. A Sakura UI
usa TypeScript 6.0 e ESLint 9, e o typescript-eslint 8 declara suporte até TS 6.
**Decisão.** TypeScript ^6.0.3, ESLint ^9.39, Vitest 5, Vite 8, React 19.3, React Router 8.
**Consequência.** Evita incompatibilidade de lint. Migrar para TS 7 quando o typescript-eslint
suportar oficialmente.

## D-005 · i18n próprio, sem biblioteca (25/11/2026)

**Contexto.** Só dois idiomas e textos simples, sem plural complexo.
**Decisão.** Dicionário tipado (`messages.ts`, chaves de en verificadas pelo tipo) para a interface
geral e `tr(pt, en)` inline para textos de cada ferramenta.
**Consequência.** Zero dependência. Se entrar um terceiro idioma ou plural de verdade, migrar para
uma biblioteca (ex.: i18next) e extrair os `tr()` para dicionários por ferramenta.
**Limitação conhecida.** Mensagens de erro geradas pelos pacotes de lógica (`packages/tools`) saem
só em português.

## D-006 · Sem Zustand, TanStack Query, Zod nem Recharts por enquanto (25/11/2026)

**Contexto.** O prompt sugere essas bibliotecas "quando necessário".
**Decisão.** Não instalar. O estado global é pequeno (tema da Sakura UI, idioma e favoritos via
`useStoredState`). Não há chamadas HTTP nem gráficos. Validação de entrada é feita pelas próprias
funções de cada ferramenta.
**Consequência.** Zod entra quando houver contrato HTTP com o backend comercial. TanStack Query entra
com o primeiro fetch. Recharts entra com o painel de consumo.

## D-007 · Formatador de XML com tokenizador próprio (25/11/2026)

**Contexto.** `DOMParser` não existe em Web Worker nem no Node, e o comportamento com DTD varia por
navegador.
**Decisão.** Tokenizador próprio que **rejeita qualquer `<!DOCTYPE>`/`<!ENTITY>`** e só aceita as
5 entidades predefinidas e referências numéricas. Limites de 10 MB e 256 níveis.
**Consequência.** XXE e "billion laughs" são impossíveis por construção. XML com DTD legítima é
recusado; NF-e não usa DTD. O mesmo código vai servir de base ao visualizador fiscal.

## D-008 · Regex em Web Worker descartável com timeout (25/11/2026)

**Decisão.** Cada execução cria um worker, com timeout de 1,5 s, e o encerra depois.
**Consequência.** Padrões catastróficos não travam a aba (verificado no navegador com `(a+)+$`).
Custo de criar worker a cada execução é baixo com o debounce de 250 ms.

## D-009 · Preços não aparecem na interface pública (25/11/2026)

**Contexto.** Os preços da versão comercial ainda são hipóteses, e a especificação pede que o Pro
apareça como planejado.
**Decisão.** A página de planos mostra Pro e Business como "Planejado", sem preço.
**Consequência.** Evita anunciar preço que pode mudar antes de existir produto. O contrato `Plan`
guarda `priceCents` configurável para quando o backend existir.

## D-010 · CNPJ alfanumérico suportado desde já (25/11/2026)

**Contexto.** A IN RFB nº 2.229/2024 introduz CNPJ com letras nas 12 primeiras posições.
**Decisão.** O validador aceita os dois formatos. Cálculo módulo 11 com valor ASCII − 48. Testado
contra o exemplo publicado pela Receita (`12.ABC.345/01DE-35`).
**Consequência.** Pronto para documentos emitidos com o novo formato.

## D-011 · CSP injetada só no build (25/11/2026)

**Contexto.** O dev server do Vite precisa de script inline para hot reload.
**Decisão.** Plugin no `vite.config.ts` injeta `<meta http-equiv="Content-Security-Policy">` no
build. `frame-ancestors` e demais headers ficam em `apps/web/public/_headers` (formato Cloudflare
Pages).
**Consequência.** `connect-src 'self'` garante que nenhuma ferramenta gratuita faça requisição
externa. `style-src 'unsafe-inline'` é necessário por causa do framer-motion da Sakura UI.

## D-012 · SPA sem pré-renderização nesta etapa (25/11/2026)

**Contexto.** O prompt pede páginas indexáveis por ferramenta.
**Decisão.** SPA com rotas `/tools/:slug`, title, description, Open Graph e canonical por rota.
Pré-renderização estática fica para a Fase 3.
**Consequência.** Buscadores que executam JS indexam, mas o ideal é gerar HTML estático por
ferramenta. Registrado em NEXT_STEPS.

## D-013 · Componentes que faltam na Sakura UI ficam no app (25/11/2026)

**Contexto.** A Sakura UI 0.2.0 não tem TextArea, controle segmentado, aviso (callout) nem
command palette.
**Decisão.** Implementar em `apps/web/src/components/ui.tsx` usando só tokens `--sk-*`. Propostas
para a biblioteca estão em `docs/SAKURA_UI_PROPOSALS.md`. O repositório da Sakura UI não foi
alterado.

## D-014 · Gerador de senha por amostragem por rejeição (25/11/2026)

**Contexto.** O gerador antigo sorteava um caractere obrigatório de cada conjunto e embaralhava.
A distribuição não era uniforme e a entropia exibida (`tamanho × log2(alfabeto)`) era maior que a
real: 25,9 bits mostrados contra no máximo 22,1 reais com 4 caracteres.
**Decisão.** Sortear a senha inteira do alfabeto completo e descartar se faltar algum conjunto.
A entropia passa a ser `log2` da quantidade de senhas válidas, calculada por inclusão-exclusão.
**Consequência.** Entropia exibida é exata. No pior caso permitido (4 caracteres, 4 conjuntos) o
gerador descarta em média ~13 tentativas, custo desprezível.

## D-015 · Formatador de XML não altera conteúdo (25/11/2026)

**Contexto.** O formatador aparava texto (`trim`) e quebrava conteúdo misto em linhas, mudando o
documento. Ex.: `<x>a <b/> b</x>` virava `<x>a<b/>b</x>` ao minificar.
**Decisão.** Só texto vazio entre elementos é tratado como indentação. Elemento com texto (ou
CDATA) como filho direto sai numa linha, exatamente como veio. Na minificação, espaços dentro de
elemento com texto são mantidos.
**Consequência.** Texto de NF-e (ex.: `<xProd>`, `<infCpl>`) nunca é alterado. Limite aceito:
espaço sozinho entre dois elementos (`<p><b>a</b> <i>b</i></p>`) ainda é tratado como
indentação, como na maioria dos formatadores.

## D-016 · Espaço sem quebra de linha é conteúdo no XML (25/11/2026)

**Contexto.** O QA do Codex mostrou que a limitação aceita na D-015 ainda alterava texto:
`<p><b>a</b> <i>b</i></p>` virava "ab" ao minificar.
**Decisão.** Substitui o "limite aceito" da D-015. Só espaço que contém quebra de linha é tratado
como indentação. Espaço sem quebra de linha entre elementos é conteúdo e é mantido.
**Consequência.** Formatar ou minificar não muda o texto lido do documento. XML gerado numa linha
só com espaços entre tags (raro) fica sem indentação nesses trechos.

## D-017 · JWT pode ter mais de uma situação temporal (25/11/2026)

**Decisão.** `DecodedJwt.temporal` virou lista (`['not-yet-valid', 'expired']`). Claim temporal
fora da faixa do `Date` gera aviso e `invalid-exp`, nunca "dentro do prazo".

## D-018 · Token de rosa para texto no tema claro (25/11/2026)

**Contexto.** O `--sk-primary` da Sakura UI (`#d88ca5`) usado como cor de texto (logo, gradiente do
título) dá 2,42:1 sobre o fundo claro, abaixo do mínimo de 4,5:1.
**Decisão.** Novo token `--st-brand-text`: `#a8486a` no claro (5,24:1 no fundo, 4,85:1 na
sidebar) e `var(--sk-primary)` no escuro (7,26:1). Botões e superfícies continuam com o primary.
**Consequência.** Um teste lê o `app.css` e falha se o contraste cair abaixo de 4,5:1. Se a Sakura
UI ganhar um token equivalente, trocar por ele (registrar em SAKURA_UI_PROPOSALS.md).

## D-019 · Resultado ligado à entrada que o gerou (25/11/2026)

**Decisão.** Toda ferramenta que calcula sob demanda guarda o resultado junto da entrada e das
opções (`useResultFor` em `apps/web/src/lib/useResultFor.ts`; hash, QR e regex fazem o mesmo de
forma assíncrona). Se a entrada muda, o resultado antigo some em vez de ficar disponível para
copiar como se fosse da entrada nova.
