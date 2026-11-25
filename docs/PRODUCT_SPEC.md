# Sakura Tools — Especificação do Produto (núcleo gratuito)

> Esta é a especificação pública do núcleo open source. O planejamento da versão comercial fica
> fora deste repositório. Decisões que refinam ou divergem deste documento ficam em
> [DECISIONS.md](./DECISIONS.md), nunca editando silenciosamente este arquivo.

## 1. Contexto

- Nome: **Sakura Tools**. Slogan: **Menos tarefas repetitivas. Mais produtividade.** Powered by
  Sakura UI.
- Fundador: Guilherme Bonin ([GitHub](https://github.com/GuiBonin)).
- Idioma principal: português brasileiro. Idioma secundário: inglês.
- Faz parte do ecossistema Sakura e usa a biblioteca de componentes open source
  [Sakura UI](https://github.com/GuiBonin/sakura-ui) ([documentação](https://guibonin.github.io/sakura-ui/)).

Regras sobre a Sakura UI: usá-la como base visual; não inventar APIs, componentes ou
funcionalidades dela; propor ampliações separadamente (`docs/SAKURA_UI_PROPOSALS.md`); não
modificar nem publicar nada no repositório dela sem autorização.

O objetivo é um produto real, com arquitetura sustentável e funcionalidades reais, e não um
protótipo visual.

## 2. Visão do produto

Plataforma de produtividade para desenvolvedores frontend e backend, suporte técnico, analistas de
sistemas, desenvolvedores de ERP, analistas fiscais, escritórios de contabilidade, freelancers e
empresas de tecnologia.

Reúne ferramentas hoje espalhadas em vários sites para reduzir tarefas repetitivas e facilitar
diagnósticos técnicos. A plataforma deve ser modular, segura, rápida, responsiva, acessível,
internacionalizável, extensível e orientada à privacidade.

## 3. Modelo open core

O núcleo e as ferramentas gratuitas são open source (MIT) e ficam neste repositório. No futuro
haverá uma versão comercial (planos Pro e Business) em módulos proprietários separados, que
consomem os contratos públicos de `packages/core`.

A versão gratuita deve ser completa dentro da sua proposta. Nada de limitação artificial para
forçar assinatura. Enquanto a versão comercial não existir, ela aparece só como "Planejado", sem
preço e sem aceitar pagamento.

Regras da fronteira:

- Este repositório funciona sozinho, sem módulos comerciais, credenciais ou serviços obrigatórios.
- Nunca publicar aqui código comercial, segredos, chaves, configurações privadas ou detalhes
  comerciais internos.
- Não incluir dependências privadas obrigatórias.
- O app comercial pode consumir o núcleo como dependência versionada.

## 4. Stack do núcleo

- **Frontend:** React, TypeScript strict, Vite, Sakura UI, React Router, Lucide Icons, Web Workers,
  i18n. TanStack Query, Zustand, Zod, IndexedDB e Recharts só quando houver necessidade real.
- **Infraestrutura:** hospedagem estática (Cloudflare Pages ou equivalente), GitHub Actions.
- **Testes:** Vitest, Testing Library, Playwright, testes de acessibilidade e de segurança.
- **Qualidade:** ESLint, Prettier, TypeScript strict, Conventional Commits, versionamento
  semântico.

Antes de escolher bibliotecas, verificar documentação oficial, manutenção, licença e versão
estável. Não instalar dependências desnecessárias nem criar complexidade prematura.

## 5. Identidade visual

Premium, elegante e profissional, baseada na Sakura UI.

Paleta: preto carvão `#151218`, fundo secundário `#211A29`, roxo escuro `#51345F`, violeta
`#9265B5`, rosa Sakura `#D88CA5`, rosa suave `#E8B4C8`, branco suave `#F5E8EE`.

Dark mode como identidade principal e light mode totalmente funcional. Animações suaves, bordas
discretas, gradientes sutis, ícones consistentes, microinterações. Evitar neon em excesso, visual
de template, animação exagerada, poluição visual e baixo contraste. Respeitar
`prefers-reduced-motion` e garantir uso completo por teclado.

## 6. Estrutura da interface

Sidebar responsiva, header, pesquisa global, command palette com Ctrl+K, navegação por categorias,
dashboard inicial, favoritos, recentes, configurações, idioma, tema, notificações, e as páginas de
documentação, planos, roadmap, changelog, privacidade, termos e contribuição.

Ferramentas gratuitas não exigem login. Cada ferramenta tem URL própria e acesso direto. Boa
experiência em computador, tablet e celular.

## 7. Catálogo de ferramentas

- **01 Programação:** JSON (formatar, validar, minificar, árvore), XML (formatar, validar
  estrutura, minificar), XML↔JSON, formatadores de HTML, CSS, JavaScript, SQL e YAML, YAML↔JSON,
  CSV↔JSON, Markdown Preview, comparador de código.
- **02 Conversores:** Base64, URL, HTML Entities, bases numéricas, unidades, cores, arquivos
  compatíveis.
- **03 Geradores:** UUID, ULID, senhas seguras, QR Code, Lorem Ipsum, dados fictícios para testes
  (identificados como dados de teste), slugs, hashes. Nunca gerador inseguro para senha ou
  identificador criptográfico.
- **04 Texto:** contador, comparador de textos, Regex Tester, remover duplicados, ordenar linhas,
  conversão de caixa (camelCase, snake_case, kebab-case), limpeza de espaços, busca e
  substituição, extração de padrões. Regex potencialmente custosa roda isolada e com limites.
- **05 Segurança:** JWT Decoder, SHA-256, SHA-512, HMAC, integridade de arquivos, força de senha,
  visualizador de certificados. O JWT Decoder explica a diferença entre decodificar e validar
  assinatura e nunca diz que um token é válido só por decodificá-lo.
- **06 Redes:** calculadoras IPv4, IPv6 e sub-redes, CIDR, validador de IP, máscaras, parser de
  cabeçalhos HTTP, User-Agent. Consultas externas só em módulos apropriados.
- **07 Frontend:** gradientes CSS, box-shadow, border-radius, paletas, contraste, HEX/RGB/HSL,
  animações CSS, Flexbox, CSS Grid, fontes.
- **08 Datas:** Unix Timestamp, ISO, diferença entre datas, fusos, intervalos, Cron. Considerar
  timezone, horário de verão e datas inválidas.
- **09 Brasil:** CPF e CNPJ (validar e gerar para teste), chave de acesso fiscal, formatação de
  documentos, CEP estrutural. Validar dígitos não comprova existência nem situação cadastral.
  Seguir as especificações oficiais atualizadas, incluindo o CNPJ alfanumérico.
- **10 Documentos fiscais:** ver seção 8.

## 8. Módulo fiscal gratuito

Central fiscal para suporte técnico, ERPs e contabilidade. Começa com NF-e (modelo 55) e NFC-e
(modelo 65), com arquitetura extensível para CT-e, MDF-e, NFS-e e eventos. Nenhum documento novo
antes de estudar a especificação oficial.

**Visualizador:** upload, arrastar e soltar, colar XML, visão estruturada, visão de código, busca
no XML, download do original, conversão para JSON. Identificar `NFe`, `nfeProc`, `enviNFe`,
`retEnviNFe`, `protNFe` e eventos suportados. Exibir, quando houver: chave, número, série, modelo,
ambiente, emissão, emitente, destinatário, produtos, quantidades, valores, descontos, frete,
seguro, outras despesas, NCM, CFOP, CST, CSOSN, ICMS, ICMS ST, FCP, IPI, PIS, COFINS, totais,
informações complementares, transporte, pagamentos, protocolos e rejeições. Considerar os grupos
de IBS e CBS conforme os layouts oficiais. Campos ausentes são normais.

**Validação:** estrutura básica, chave de acesso e dígitos, campos ausentes, comparação simples
entre documentos, consulta local de rejeições documentadas.

**Regras gerais:** não considerar uma nota autorizada só porque existe XML ou protocolo não
verificado. Validação local nunca é apresentada como autorização da SEFAZ. Não inventar regra
tributária. Fontes: Portal Nacional da NF-e, SPED, MOC, schemas XSD oficiais, notas técnicas
vigentes e documentação das SEFAZ. Cada regra registra fonte, versão e vigência, e tem teste.

**DANFE:** só depois de estudar os layouts oficiais. Representação incompleta não é apresentada
como DANFE conforme.

**Privacidade:** XML processado no navegador. Documentos fiscais têm CPF, CNPJ, endereços e
valores. Nada é enviado para API, telemetria ou IA. Nunca usar documento real de cliente como
fixture.

## 9. Arquitetura modular

Registro de ferramentas com metadados (ID, slug, nome, descrição, categoria, ícone,
palavras-chave, idiomas, tipo de execução, status). Cada ferramenta tem interface, lógica, tipos,
validação, testes, exemplos e tratamento de erro, com carregamento sob demanda.

`packages/core` publica os contratos de extensão (registro, entitlements por chave, extensões,
provedor de IA) para que módulos externos se pluguem sem alterar as ferramentas gratuitas. O
núcleo não decide acesso pago: qualquer autorização real acontece fora do navegador. Detalhes em
[ARCHITECTURE.md](./ARCHITECTURE.md).

## 10. Segurança e privacidade

Considerar OWASP, XSS, CSRF, SSRF, injeções, CSP, uploads maliciosos, XXE, XML bombs, arquivos
grandes, DoS, dependências vulneráveis e prompt injection. Rejeitar entidades XML externas. Limitar
tamanho e complexidade das entradas. Web Workers para trabalho pesado. Nenhuma chave no bundle.
`.env.example` sem segredos. Secret scanning e verificação de dependências.

**LGPD:** minimização, transparência, exclusão e segurança. Não afirmar conformidade sem avaliação.
Privacidade e termos são rascunhos para revisão profissional. Detalhes em
[SECURITY.md](./SECURITY.md).

## 11. Experiência do usuário

Cada ferramenta: título, descrição, entrada, resultado, executar quando necessário, copiar, limpar,
exemplo, erros claros, indicador de processamento, opções, documentação curta, avisos relevantes.
Nada de botão decorativo nem recurso que parece funcionar sem estar implementado. Ferramenta não
desenvolvida fica omitida ou marcada como planejada. Atalhos úteis. Favoritos locais sem login.
Entradas sensíveis nunca são armazenadas.

## 12. Página inicial

Título: "Menos tarefas repetitivas. Mais produtividade." Subtítulo: "Uma central de ferramentas
para desenvolvedores, suporte técnico e análise fiscal. Rápida, segura e construída para o seu dia
a dia."

Seções: hero, ferramentas reais, categorias, diferenciais, privacidade, módulo fiscal, open
source, planos, FAQ, changelog, comunidade, footer. Não inventar avaliações, depoimentos, clientes
ou métricas.

## 13. SEO

Página indexável por ferramenta: title, meta description, URL amigável, Open Graph, sitemap,
canonical, robots.txt e dados estruturados quando fizer sentido. Conteúdo útil em pt e en.
Exemplos: `/tools/json-formatter`, `/tools/xml-formatter`, `/tools/base64`,
`/tools/regex-tester`, `/fiscal/nfe-viewer`, `/fiscal/nfce-viewer`, `/fiscal/rejection-codes`.
Renderização adequada à indexação. Nada de páginas vazias para manipular busca.

## 14. Open source

README (pt e en), LICENSE MIT, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, roadmap,
documentação de arquitetura, templates de issue e PR, GitHub Actions. README com screenshots
reais, instalação local completa e como adicionar ferramenta. Não alterar retroativamente a licença
de código já distribuído. Respeitar licenças das dependências.

## 15. Testes e qualidade

Testar transformações, cálculos, validadores, conversões, arquivos inválidos, entradas grandes,
Unicode, casos extremos, regras fiscais, responsividade e acessibilidade. Fixtures fictícias.
Nada de teste que só confirma mock. Lint, typecheck, unitários, integração, e2e e build rodando e
passando. Nunca declarar teste aprovado sem executar.

## 16. Roadmap do núcleo

- **Fase 0, descoberta e arquitetura:** Sakura UI, ambiente, stack, fronteira público/privado,
  documentação.
- **Fase 1, núcleo gratuito:** layout, pesquisa, categorias, favoritos, recentes, temas, i18n,
  registro modular e 15 ferramentas (JSON, XML, Base64, URL, UUID, senha, cores, regex, diff,
  timestamp, QR Code, SHA-256, JWT, CPF, CNPJ).
- **Fase 2, fiscal gratuito:** visualizador NF-e e NFC-e, validação estrutural, chave de acesso,
  comparador de XML, extração, exportação básica, rejeições documentadas.
- **Fase 3, lançamento open source:** auditoria, testes, documentação, screenshots, licenças,
  deploy e primeira release.
- **Fases seguintes:** versão comercial, planejada fora deste repositório, e expansão do catálogo
  gratuito (novas ferramentas, documentos fiscais, idiomas).

## 17. Continuidade entre agentes

Claude Code, Codex e outros agentes não compartilham memória. Manter atualizados: `AGENTS.md`,
`CLAUDE.md` (sem duplicar o AGENTS.md), este arquivo, `ARCHITECTURE.md`, `ROADMAP.md`,
`DECISIONS.md`, `SECURITY.md`, `PROJECT_STATE.md` e `NEXT_STEPS.md`. O `PROJECT_STATE.md` registra
fase, concluído, pendente, testes executados, problemas, bloqueios e próximas ações. Nada de
segredos, credenciais, dados de clientes ou detalhes comerciais privados na documentação pública.

## 18. Regras de execução do agente

Antes de mexer: inspecionar o workspace e o Git, preservar trabalho existente, ler as instruções
do projeto. Sem comandos destrutivos, `git reset --hard` ou force push sem autorização. Não
modificar repositórios externos, não publicar, não criar recursos pagos nem chamadas de IA com
custo sem autorização. Não inventar credenciais, endpoints, resultados de teste ou funcionalidades.
Mocks só em testes. Registrar bloqueios reais. Trabalhar em incrementos verificáveis: verificar,
corrigir, documentar, resumir e registrar pendências. Decisões técnicas simples e reversíveis não
precisam de confirmação. Priorizar qualidade, segurança, desempenho e manutenibilidade.

## 19. Critérios de aceitação do MVP gratuito

App roda localmente e em build de produção; as 15 ferramentas funcionam; usa Sakura UI; temas
funcionam; responsivo; pesquisa e favoritos funcionam; sem login; dados sensíveis ficam locais;
regras principais testadas; nenhuma credencial no repositório; README completo; licença MIT;
documentação permite rodar sem ajuda; fronteira com o comercial documentada; planejado separado
do implementado. Pagamento, banco ou IA não são necessários.
