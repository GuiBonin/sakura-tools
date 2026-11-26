<div align="center">

<img src="apps/web/public/favicon-192.png" width="72" height="72" alt="" />

# Sakura Tools

**Menos tarefas repetitivas. Mais produtividade.**

Central de ferramentas para desenvolvedores, suporte técnico e análise fiscal.
Tudo processado no seu navegador. Open source. Powered by [Sakura UI](https://github.com/GuiBonin/sakura-ui).

[English](./README.en.md) · [Contribuir](./CONTRIBUTING.md)

</div>

> **Estado:** em desenvolvimento. Ainda não há versão publicada.

## Ferramentas disponíveis

| Categoria   | Ferramentas                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| Programação | Formatador de JSON (formata, valida, minifica, ordena chaves), Formatador de XML (formata, minifica, valida estrutura) |
| Conversores | Base64 (UTF-8 e URL-safe), URL Encode/Decode                                                                           |
| Geradores   | UUID v4 e v7, senhas, QR Code (texto, link, Wi-Fi; SVG e PNG)                                                          |
| Texto       | Testador de Regex (isolado em Web Worker), comparador de textos                                                        |
| Segurança   | Hash SHA-1/256/384/512 e HMAC de texto e arquivo, decodificador de JWT                                                 |
| Frontend    | Conversor HEX/RGB/HSL/CMYK com contraste WCAG                                                                          |
| Datas       | Unix Timestamp com fusos horários                                                                                      |
| Brasil      | Validador e gerador de teste de CPF e CNPJ (inclusive CNPJ alfanumérico)                                               |
| Fiscal      | Validador de chave de acesso da NF-e e da NFC-e, campo a campo (inclusive CNPJ alfanumérico)                           |

## Privacidade

As ferramentas gratuitas não enviam nada para servidor nenhum. A Content Security Policy do build
bloqueia conexões externas (`connect-src 'self'`). Só ficam salvos no navegador o tema, o idioma
e os IDs das ferramentas favoritas e recentes. O que você digita nunca é salvo.

## Rodando localmente

Requisitos: Node.js 20.19 ou mais novo e npm.

```bash
git clone https://github.com/GuiBonin/sakura-tools.git
cd sakura-tools
npm install
npm run dev
```

Abra http://localhost:5173. Não precisa de conta, chave de API nem banco de dados.

| Comando             | O que faz                                          |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                        |
| `npm test`          | Testes (Vitest + Testing Library)                  |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | TypeScript em todos os pacotes                     |
| `npm run build`     | Build de produção em `apps/web/dist`               |
| `npm run preview`   | Serve o build localmente                           |
| `npm run check`     | Tudo acima, como no CI                             |
| `npm run test:e2e`  | Testes E2E com Playwright (usa o Chrome instalado) |

## Estrutura

```
apps/web          App React + Vite
packages/core     Contratos públicos: registro de ferramentas, entitlements, extensões
packages/tools    Lógica pura das ferramentas e catálogo
docs/             Arquitetura, segurança e como criar uma ferramenta
```

Detalhes em [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Para criar uma ferramenta nova, siga
[docs/ADDING_A_TOOL.md](./docs/ADDING_A_TOOL.md).

## Open core

Este repositório é o núcleo gratuito, MIT, e funciona sozinho. Recursos Pro e Business (lote,
diagnóstico fiscal avançado, Sakura AI, equipes) serão módulos separados e proprietários, que
consomem os contratos de `packages/core`. Nenhum desses recursos está disponível hoje e nenhum
pagamento é aceito.

## Licença

[MIT](./LICENSE) © Guilherme Bonin
